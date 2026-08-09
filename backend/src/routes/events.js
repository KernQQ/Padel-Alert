const express = require("express");
const {
  addClient,
  countClients
} = require("../services/realtimeHub");

const router = express.Router();

router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  addClient(res);

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      ok: true,
      clients: countClients(),
      at: new Date().toISOString()
    })}\n\n`
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  res.on("close", () => {
    clearInterval(heartbeat);
  });
});

module.exports = router;
