const express = require("express");
const { updateStore } = require("../services/communityStore");
const { config } = require("../config/env");
const { isConfigured } = require("../services/pushService");

const router = express.Router();

function clean(value, max = 300) {
  return String(value || "").trim().slice(0, max);
}
function owner(req) {
  return clean(req.headers["x-owner-token"], 100);
}

router.get("/config", (req, res) => {
  res.json({
    ok: true,
    enabled: isConfigured(),
    publicKey: isConfigured() ? config.vapidPublicKey : ""
  });
});

router.post("/subscribe", async (req, res) => {
  const id = owner(req);
  const subscription = req.body?.subscription;
  if (!id) return res.status(401).json({ ok:false, message:"Zaloguj się ponownie." });
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ ok:false, message:"Nieprawidłowa subskrypcja push." });
  }

  const result = await updateStore((data) => {
    if (!data.users?.[id]) return { error:[401,"Zaloguj się ponownie."] };
    data.pushSubscriptions ||= {};
    const list = Array.isArray(data.pushSubscriptions[id]) ? data.pushSubscriptions[id] : [];
    const filtered = list.filter((item) => item.endpoint !== subscription.endpoint);
    filtered.push(subscription);
    data.pushSubscriptions[id] = filtered.slice(-5);
    return { ok:true };
  });
  if (result?.error) return res.status(result.error[0]).json({ ok:false, message:result.error[1] });
  res.status(201).json({ ok:true });
});

router.delete("/subscribe", async (req, res) => {
  const id = owner(req);
  const endpoint = clean(req.body?.endpoint, 1000);
  if (!id) return res.status(401).json({ ok:false, message:"Zaloguj się ponownie." });
  await updateStore((data) => {
    data.pushSubscriptions ||= {};
    data.pushSubscriptions[id] = (data.pushSubscriptions[id] || []).filter((item) => item.endpoint !== endpoint);
  });
  res.json({ ok:true });
});

module.exports = router;
