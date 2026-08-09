const express = require("express");
const {
  getDatabaseStatus
} = require("../services/communityStore");

const router = express.Router();

router.get("/", async (req, res) => {
  const status = await getDatabaseStatus();

  res.status(
    status.enabled && status.connected === false ? 503 : 200
  ).json({
    ok: status.connected !== false,
    ...status
  });
});

module.exports = router;
