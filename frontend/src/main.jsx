import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);


const manifestLink = document.createElement("link");
manifestLink.rel = "manifest";
manifestLink.href = "/manifest.webmanifest";
document.head.appendChild(manifestLink);

const themeMeta = document.createElement("meta");
themeMeta.name = "theme-color";
themeMeta.content = "#122219";
document.head.appendChild(themeMeta);

const viewportMeta = document.querySelector('meta[name="viewport"]');
if (viewportMeta) {
  viewportMeta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, viewport-fit=cover"
  );
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA cache must never prevent the app itself from starting.
    });
  });
}
