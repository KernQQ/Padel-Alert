const { config } = require("../config/env");

let webpush = null;
try {
  webpush = require("web-push");
} catch {
  webpush = null;
}

function isConfigured() {
  return Boolean(webpush && config.vapidPublicKey && config.vapidPrivateKey);
}

if (isConfigured()) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
}

function sendPush(data, ownerToken, payload) {
  if (!isConfigured()) return;
  const subscriptions = data.pushSubscriptions?.[ownerToken] || [];
  for (const subscription of subscriptions) {
    Promise.resolve(
      webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: payload.title || "PADLETIC",
          body: payload.body || payload.message || "Masz nowe powiadomienie.",
          url: payload.url || "/",
          tag: payload.tag || "padletic-notification"
        }),
        { TTL: 60 * 60 }
      )
    ).catch((error) => {
      if (![404, 410].includes(error?.statusCode)) {
        console.warn("Push error:", error?.message || error);
      }
    });
  }
}

module.exports = { isConfigured, sendPush };
