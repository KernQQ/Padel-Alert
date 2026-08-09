const express = require("express");
const bo5Service = require("../services/bo5Service");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    clubs: bo5Service.getClubs()
  });
});

module.exports = router;
