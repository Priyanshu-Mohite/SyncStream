import rateLimit from "express-rate-limit";

// Global API limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict limiter for Auth endpoints (to prevent brute-force/OTP spam)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Limit each IP to 10 requests per hour for auth routes
  message: {
    message: "Too many login/register attempts from this IP, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});