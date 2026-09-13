import rateLimit from "express-rate-limit";

/**
 * Rate limits.
 *
 * Before these, eight failed logins in a row against the live site were all
 * processed without complaint — there was nothing between an attacker and an
 * unlimited password guessing loop against a known admin address.
 *
 * `trust proxy` is set on the app, so `req.ip` is the real client address from
 * X-Forwarded-For rather than Nginx's 127.0.0.1 — without it every visitor
 * would share one bucket and the first busy minute would lock out the shop.
 */

/**
 * Failed logins only — a successful sign-in costs nothing against the budget.
 *
 * The whole shop sits behind one public IP, so every till and phone shares a
 * bucket. Set this too tight and a few mistyped passwords on a busy evening
 * lock out the business, which is a worse outcome than the attack. Twenty
 * failures per quarter hour still caps an attacker at roughly eighty guesses an
 * hour — useless against any real password — while leaving staff room to fumble.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Wait a few minutes and try again." },
});

/**
 * Everything else. Generous, because a POS in service is genuinely chatty —
 * this is here to stop scraping and runaway loops, not to police normal use.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down and try again shortly." },
});

/** Password changes and resets: cheap to attempt, expensive to get wrong. */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
});
