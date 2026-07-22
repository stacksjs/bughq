import { fetchWithRetry } from '@stacksjs/ai'
import { GITHUB_API, ghHeaders } from '@stacksjs/github'

export interface RepositoryTreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
}

export interface RepositoryTarget {
  owner: string
  repo: string
}

export interface PullRequestFile {
  path: string
  content: string
}

export function parseRepository(value: string): RepositoryTarget {
  const normalized = value.trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '')
  const [owner, repo, ...rest] = normalized.split('/')
  if (rest.length || !owner || !repo || owner === '.' || owner === '..' || repo === '.' || repo === '..' || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo))
    throw new Error('Repository must be a GitHub owner/repository name or URL')
  return { owner, repo }
}

function repositoryPath(target: RepositoryTarget): string {
  return `/repos/${target.owner}/${target.repo}`
}

async function githubJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithRetry(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...ghHeaders(), 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) {
    const payload = await response.text()
    let message = payload
    try { message = (JSON.parse(payload) as { message?: string }).message || payload }
    catch {}
    throw new Error(`GitHub API ${response.status}: ${message || response.statusText}`)
  }
  return await response.json() as T
}

export async function repositoryInfo(target: RepositoryTarget): Promise<{ defaultBranch: string }> {
  const repository = await githubJson<{ default_branch: string }>(repositoryPath(target))
  return { defaultBranch: repository.default_branch }
}

export async function repositoryTree(target: RepositoryTarget, ref: string): Promise<{ entries: RepositoryTreeEntry[], truncated: boolean }> {
  const tree = await githubJson<{ tree?: RepositoryTreeEntry[], truncated?: boolean }>(
    `${repositoryPath(target)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  )
  return { entries: tree.tree ?? [], truncated: !!tree.truncated }
}

export async function repositoryFile(target: RepositoryTarget, path: string, ref: string, maxBytes: number): Promise<string> {
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))
    throw new Error(`Unsafe repository path: ${path}`)
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  const file = await githubJson<{ type?: string, encoding?: string, content?: string, size?: number }>(
    `${repositoryPath(target)}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
  )
  if (file.type !== 'file' || file.encoding !== 'base64' || !file.content)
    throw new Error(`Repository path is not a file: ${path}`)
  if ((file.size ?? 0) > maxBytes)
    throw new Error(`Repository file is too large: ${path}`)
  const content = Buffer.from(file.content.replace(/\n/g, ''), 'base64')
  if (content.byteLength > maxBytes)
    throw new Error(`Decoded repository file is too large: ${path}`)
  return content.toString('utf8')
}

function validatePullRequestFiles(files: PullRequestFile[]): void {
  if (!files.length)
    throw new Error('The AI did not produce any file changes')
  const seen = new Set<string>()
  for (const file of files) {
    if (!file.path || file.path.startsWith('/') || file.path.includes('\\') || file.path.split('/').includes('..'))
      throw new Error(`Unsafe repository path: ${file.path}`)
    if (seen.has(file.path))
      throw new Error(`Duplicate repository path: ${file.path}`)
    seen.add(file.path)
  }
}

export async function createPullRequest(options: {
  target: RepositoryTarget
  base: string
  branch: string
  title: string
  body: string
  commitMessage: string
  files: PullRequestFile[]
  draft: boolean
}): Promise<{ number: number, url: string, commitSha: string }> {
  validatePullRequestFiles(options.files)
  const basePath = repositoryPath(options.target)
  const reference = await githubJson<{ object: { sha: string } }>(`${basePath}/git/ref/heads/${encodeURIComponent(options.base)}`)
  const baseCommit = await githubJson<{ tree: { sha: string } }>(`${basePath}/git/commits/${reference.object.sha}`)
  const blobs = await Promise.all(options.files.map(async (file) => {
    const blob = await githubJson<{ sha: string }>(`${basePath}/git/blobs`, {
      method: 'POST', body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
    })
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
  }))
  const tree = await githubJson<{ sha: string }>(`${basePath}/git/trees`, {
    method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: blobs }),
  })
  const commit = await githubJson<{ sha: string }>(`${basePath}/git/commits`, {
    method: 'POST', body: JSON.stringify({ message: options.commitMessage, tree: tree.sha, parents: [reference.object.sha] }),
  })
  await githubJson(`${basePath}/git/refs`, {
    method: 'POST', body: JSON.stringify({ ref: `refs/heads/${options.branch}`, sha: commit.sha }),
  })
  const pull = await githubJson<{ number: number, html_url: string }>(`${basePath}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title: options.title, body: options.body, head: options.branch, base: options.base, draft: options.draft }),
  })
  return { number: pull.number, url: pull.html_url, commitSha: commit.sha }
}
