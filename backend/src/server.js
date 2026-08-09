require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  config,
  validateEnvironment
} = require("./config/env");
const {
  securityHeaders,
  requestId,
  noStore,
  authRateLimit
} = require("./middleware/security");

const statusRoute = require("./routes/status");
const clubsRoute = require("./routes/clubs");
const availabilityRoute = require("./routes/availability");
const communityRoute = require("./routes/community");
const matchesRoute = require("./routes/matches");
const matchmakingRoute = require("./routes/matchmaking");
const eventsRoute = require("./routes/events");
const authRoute = require("./routes/auth");
const databaseRoute = require("./routes/database");
const { closeDatabase, getDatabaseStatus } = require("./services/communityStore");

const app = express();
const PORT = config.port;

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

const environmentCheck = validateEnvironment();

for (const warning of environmentCheck.warnings) {
  console.warn("⚠️ ENV:", warning);
}

if (!environmentCheck.ok) {
  console.error(
    "❌ Nieprawidłowa konfiguracja produkcyjna:"
  );

  for (const error of environmentCheck.errors) {
    console.error(" -", error);
  }

  if (config.isProduction) {
    process.exit(1);
  }
}

function corsOrigin(origin, callback) {
  // Server-to-server / curl / native apps may not send Origin.
  if (!origin) {
    return callback(null, true);
  }

  if (!config.isProduction &&
      config.allowedOrigins.length === 0) {
    return callback(null, true);
  }

  if (config.allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(
    new Error("Origin niedozwolony przez CORS.")
  );
}

app.use(requestId);
app.use(securityHeaders);
app.use(noStore);
app.use(
  cors({
    origin: corsOrigin,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Owner-Token",
      "X-Request-Id"
    ],
    exposedHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining"
    ]
  })
);
app.use(
  express.json({
    limit: config.maxJsonSize
  })
);

app.use("/auth/login", authRateLimit);
app.use("/auth/register", authRateLimit);

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "padelalert-api",
    version: "2.3.0-beta",
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString()
  });
});

app.get("/ready", async (req, res) => {
  const database = await getDatabaseStatus();

  const ready =
    database.provider === "postgresql"
      ? database.connected === true
      : !config.isProduction;

  res.status(ready ? 200 : 503).json({
    ok: ready,
    database,
    environment: config.env
  });
});

app.get("/", (req, res) => {
  res.send("🎾 PadelAlert API działa");
});

app.use("/status", statusRoute);
app.use("/clubs", clubsRoute);
app.use("/availability", availabilityRoute);
app.use("/community", communityRoute);
app.use("/matches", matchesRoute);
app.use("/matchmaking", matchmakingRoute);
app.use("/events", eventsRoute);
app.use("/auth", authRoute);
app.use("/database", databaseRoute);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Nie znaleziono endpointu",
    requestId: req.requestId
  });
});

app.use((error, req, res, next) => {
  console.error(
    `[${req.requestId || "no-request-id"}]`,
    error
  );

  const corsError =
    error?.message ===
    "Origin niedozwolony przez CORS.";

  res.status(corsError ? 403 : 500).json({
    ok: false,
    message: corsError
      ? "Ta domena nie ma dostępu do API."
      : "Wystąpił błąd serwera.",
    requestId: req.requestId
  });
});

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `🚀 PadelAlert API (${config.env}) działa na porcie ${PORT}`
  );

  const db = await getDatabaseStatus();

  if (db.provider === "postgresql" && db.connected) {
    console.log("🐘 PostgreSQL: połączono");
  } else if (db.provider === "json") {
    console.log("📄 Baza: community.json (tryb fallback)");
  } else {
    console.error("❌ PostgreSQL:", db.error || "brak połączenia");
  }
});

async function shutdown(signal) {
  console.log(`
${signal}: zamykanie PadelAlert...`);

  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
