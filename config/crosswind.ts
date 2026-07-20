/**
 * Crosswind (utility CSS) — content globs for STX views.
 * @see https://github.com/cwcss/crosswind
 */
export default {
  content: [
    './resources/views/**/*.{stx,html}',
    './resources/**/*.{stx,html}',
    // Framework defaults resolve from the published package, not the vendored
    // storage/framework/ tree. Error-handling ships its own dist styles.
    './node_modules/@stacksjs/defaults/resources/views/**/*.{stx,html}',
    './node_modules/@stacksjs/defaults/resources/components/**/*.{stx,html}',
  ],
  preflight: true,
  minify: false,
}
