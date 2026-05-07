import rateLimit from 'express-rate-limit';

// General API rate limiter — protects against DoS / brute force
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.' },
});

// Strict limiter for expensive AI synthesis endpoints
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI Synthesis quota exceeded. Please try again later.' },
});
