const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "PadelAlert działa poprawnie",
    time: new Date().toISOString()
  });
});

module.exports = router;
