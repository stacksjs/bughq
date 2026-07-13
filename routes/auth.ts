import { passwordResets } from '@stacksjs/auth'
import { response, route } from '@stacksjs/router'

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
route.get('/api/me', 'Actions/MeAction').skipCsrf()

// Password reset. The send side uses the framework's passwordResets helper
// directly: it is anti-enumeration by design (unknown emails are a silent
// no-op), so this endpoint always answers with the same message and never
// reveals whether an account exists. The reset side reuses the framework's
// default action (hashed single-use tokens, expiry, session revocation).
// The emailed link points at /reset-password (config/auth.ts passwordReset.url).
route.post('/password/forgot', async (request: any) => {
  const email = String((request.jsonBody ?? {}).email ?? '').trim().toLowerCase()
  const uniform = { success: true, message: 'If an account exists for that email, a reset link is on its way.' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return response.json(uniform)
  try {
    await passwordResets(email).sendEmail()
  }
  catch (err) {
    // Transport failure must not leak account existence; surface it in the
    // server log only.
    console.error('[password/forgot] send failed:', err instanceof Error ? err.message : err)
  }
  return response.json(uniform)
}).skipCsrf().rateLimit(3, 'minute')
route.post('/password/reset', 'Actions/Password/PasswordResetAction').skipCsrf().rateLimit(5, 'minute')

// Social sign-in (GitHub, Google) via the native @stacksjs/socials drivers.
// GET flows, CSRF-exempt; provider credentials come from config/services.ts.
route.get('/api/auth/{provider}/redirect', 'Actions/Auth/SocialRedirectAction').skipCsrf()
route.get('/api/auth/{provider}/callback', 'Actions/Auth/SocialCallbackAction').skipCsrf()

// Billing (Stripe). Checkout requires an authenticated user (bearer token);
// the webhook is a Stripe callback so it skips CSRF and auth.
route.post('/payments/checkout', 'Actions/Payment/CreateCheckoutAction').middleware('auth').skipCsrf()
route.post('/webhooks/stripe', 'Actions/StripeWebhook').skipCsrf()
