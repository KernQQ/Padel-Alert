import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Capture the browser installation event before React mounts. This prevents
// the install button from missing an early beforeinstallprompt event.
window.__padleticInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__padleticInstallPrompt = event;
  window.dispatchEvent(new CustomEvent("padletic:installprompt", { detail: event }));
});
window.addEventListener("appinstalled", () => {
  window.__padleticInstallPrompt = null;
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

const themeMeta = document.querySelector('meta[name="theme-color"]') || document.createElement("meta");
themeMeta.name = "theme-color";
themeMeta.content = "#07110c";
if (!themeMeta.parentNode) document.head.appendChild(themeMeta);

const viewportMeta = document.querySelector('meta[name="viewport"]');
if (viewportMeta) {
  viewportMeta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {
      // Service worker must never prevent the application itself from starting.
    });
  });
}
