import { route } from '@stacksjs/router'

/**
 * Auth endpoints, re-registered at the root with `.skipCsrf()`.
 *
 * These use the framework's default Auth actions (resolved by string), but the
 * defaults are CSRF-gated — which blocks the same-origin `fetch()` from the
 * login/register pages. Token auth is CSRF-immune (bearer tokens aren't sent
 * automatically by the browser the way cookies are), so skipping CSRF here is
 * safe; the rate limits are kept. User route files load before the framework
 * defaults, so these win on the duplicate method+path.
 */
route.post('/login', 'Actions/Auth/LoginAction').skipCsrf().rateLimit(5, 'minute')
route.post('/register', 'Actions/Auth/RegisterAction').skipCsrf().rateLimit(3, 'minute')
route.post('/logout', 'Actions/Auth/LogoutAction').skipCsrf()
