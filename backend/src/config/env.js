const isProduction = process.env.NODE_ENV === "production";

function csv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function boolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(
    String(value).toLowerCase()
  );
}

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl: String(process.env.DATABASE_URL || "").trim(),
  pgSsl: boolean(process.env.PG_SSL, false),
  trustProxy: boolean(process.env.TRUST_PROXY, isProduction),
  allowedOrigins: csv(process.env.ALLOWED_ORIGINS),
  frontendUrl: String(process.env.FRONTEND_URL || "").trim(),
  maxJsonSize: process.env.MAX_JSON_SIZE || "256kb",
  sessionDays: Math.max(
    1,
    Number(process.env.SESSION_DAYS || 30)
  ),
  authWindowMs: Math.max(
    10000,
    Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000)
  ),
  authMaxAttempts: Math.max(
    3,
    Number(process.env.AUTH_RATE_MAX || 12)
  )
};

function validateEnvironment() {
  const warnings = [];
  const errors = [];

  if (isProduction && !config.databaseUrl) {
    errors.push(
      "DATABASE_URL jest wymagany w NODE_ENV=production."
    );
  }

  if (
    isProduction &&
    config.allowedOrigins.length === 0
  ) {
    errors.push(
      "ALLOWED_ORIGINS jest wymagany w NODE_ENV=production."
    );
  }

  if (
    isProduction &&
    !config.frontendUrl
  ) {
    warnings.push(
      "FRONTEND_URL nie jest ustawiony."
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  config,
  validateEnvironment
};
