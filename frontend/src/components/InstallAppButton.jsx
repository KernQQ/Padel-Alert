import { useEffect, useState } from "react";

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function InstallAppButton({ compact = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    function handleBeforeInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) {
    return null;
  }

  const canPrompt = Boolean(installPrompt);
  const ios = isIosDevice();

  if (!canPrompt && !ios) {
    return null;
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }

      setInstallPrompt(null);
      return;
    }

    if (ios) {
      setShowIosHint(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "install-app-button compact" : "install-app-button"}
        onClick={install}
        title="Dodaj PadelAlert do ekranu głównego"
      >
        <span>⬇</span>
        {!compact && "Zainstaluj aplikację"}
      </button>

      {showIosHint && (
        <div
          className="install-hint-backdrop"
          role="presentation"
          onClick={() => setShowIosHint(false)}
        >
          <section
            className="install-hint-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="install-hint-close"
              onClick={() => setShowIosHint(false)}
            >
              ×
            </button>

            <span className="install-hint-icon">📲</span>
            <h3>Dodaj PadelAlert do ekranu głównego</h3>
            <p>
              W Safari wybierz <strong>Udostępnij</strong>, a następnie
              <strong> „Do ekranu początkowego”</strong>.
            </p>

            <button
              type="button"
              className="install-hint-ok"
              onClick={() => setShowIosHint(false)}
            >
              Rozumiem
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default InstallAppButton;
