const crypto = require("crypto");
const { config } = require("../config/env");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader(
    "Cross-Origin-Opener-Policy",
    "same-origin"
  );

  if (config.isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
}

function requestId(req, res, next) {
  const incoming = String(
    req.headers["x-request-id"] || ""
  ).trim();

  req.requestId =
    incoming.slice(0, 100) ||
    crypto.randomUUID();

  res.setHeader(
    "X-Request-Id",
    req.requestId
  );

  next();
}

function noStore(req, res, next) {
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/community/notifications")
  ) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
}

const buckets = new Map();

function authRateLimit(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (
    !bucket ||
    now - bucket.startedAt > config.authWindowMs
  ) {
    bucket = {
      startedAt: now,
      count: 0
    };

    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(
    0,
    config.authMaxAttempts - bucket.count
  );

  res.setHeader(
    "X-RateLimit-Limit",
    String(config.authMaxAttempts)
  );
  res.setHeader(
    "X-RateLimit-Remaining",
    String(remaining)
  );

  if (bucket.count > config.authMaxAttempts) {
    const retryAfter = Math.ceil(
      (config.authWindowMs -
        (now - bucket.startedAt)) /
        1000
    );

    res.setHeader(
      "Retry-After",
      String(Math.max(1, retryAfter))
    );

    return res.status(429).json({
      ok: false,
      message:
        "Za dużo prób. Spróbuj ponownie za kilka minut."
    });
  }

  next();
}

// Prevent unbounded memory growth in long-running processes.
setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets.entries()) {
    if (
      now - bucket.startedAt >
      config.authWindowMs * 2
    ) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

module.exports = {
  securityHeaders,
  requestId,
  noStore,
  authRateLimit
};
