import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function browserName() {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome/") || ua.includes("crios/")) return "Chrome";
  if (ua.includes("safari/")) return "Safari";
  return "przeglądarce";
}

export default function InstallAppButton({ compact = false, variant = "button" }) {
  const [installPrompt, setInstallPrompt] = useState(() => window.__padleticInstallPrompt || null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [status, setStatus] = useState("");

  useEffect(() => {
    function promptReady(event) {
      setInstallPrompt(event.detail || window.__padleticInstallPrompt || null);
    }

    function installedNow() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    }

    window.addEventListener("padletic:installprompt", promptReady);
    window.addEventListener("appinstalled", installedNow);

    const mode = window.matchMedia?.("(display-mode: standalone)");
    const handleMode = () => setInstalled(isStandalone());
    mode?.addEventListener?.("change", handleMode);

    return () => {
      window.removeEventListener("padletic:installprompt", promptReady);
      window.removeEventListener("appinstalled", installedNow);
      mode?.removeEventListener?.("change", handleMode);
    };
  }, []);

  const platformText = useMemo(() => {
    if (isIosDevice()) return "iPhone / iPad";
    if (isAndroidDevice()) return "Android";
    return "komputer";
  }, []);

  if (installed) {
    if (variant === "tile") {
      return (
        <div className="install-app-tile installed" aria-label="PADLETIC jest zainstalowany">
          <span className="install-app-logo"><img src="/icons/icon-192.png" alt="" /></span>
          <span><strong>PADLETIC jest zainstalowany</strong><small>Uruchamiaj aplikację z ekranu głównego.</small></span>
          <b>✓</b>
        </div>
      );
    }
    return null;
  }

  async function install() {
    setStatus("");
    const prompt = installPrompt || window.__padleticInstallPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        window.__padleticInstallPrompt = null;
        setInstallPrompt(null);

        if (choice?.outcome === "accepted") {
          setStatus("Instalowanie PADLETIC…");
        } else {
          setStatus("Instalacja została anulowana.");
        }
        return;
      } catch {
        // Gdy przeglądarka zużyła już prompt, przechodzimy do instrukcji.
      }
    }

    setShowHelp(true);
  }

  const buttonClass = [
    "install-app-button",
    compact ? "compact" : "",
    variant === "sidebar" ? "sidebar-install" : "",
    variant === "tile" ? "tile-install" : ""
  ].filter(Boolean).join(" ");

  const control = variant === "tile" ? (
    <button type="button" className="install-app-tile" onClick={install}>
      <span className="install-app-logo"><img src="/icons/icon-192.png" alt="" /></span>
      <span><strong>Zainstaluj PADLETIC</strong><small>Dodaj aplikację do ekranu głównego</small></span>
      <b>→</b>
    </button>
  ) : (
    <button
      type="button"
      className={buttonClass}
      onClick={install}
      title="Zainstaluj PADLETIC"
    >
      <span className="install-button-icon">↧</span>
      {!compact && <span>Zainstaluj PADLETIC</span>}
    </button>
  );

  const help = showHelp && createPortal(
    <div className="install-hint-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
      <section className="install-hint-card" role="dialog" aria-modal="true" aria-label="Instalacja PADLETIC" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="install-hint-close" onClick={() => setShowHelp(false)} aria-label="Zamknij">×</button>
        <img className="install-hint-brand-icon" src="/icons/icon-192.png" alt="PADLETIC" />
        <span className="section-kicker">Aplikacja PADLETIC</span>
        <h3>Dodaj PADLETIC do ekranu głównego</h3>

        {isIosDevice() ? (
          <div className="install-steps">
            <p><b>1.</b> Otwórz tę stronę w <strong>Safari</strong>.</p>
            <p><b>2.</b> Naciśnij <strong>Udostępnij</strong> (kwadrat ze strzałką).</p>
            <p><b>3.</b> Wybierz <strong>„Do ekranu początkowego”</strong> i zatwierdź.</p>
          </div>
        ) : isAndroidDevice() ? (
          <div className="install-steps">
            <p><b>1.</b> W Chrome naciśnij menu <strong>⋮</strong>.</p>
            <p><b>2.</b> Wybierz <strong>„Zainstaluj aplikację”</strong> lub <strong>„Dodaj do ekranu głównego”</strong>.</p>
            <p><b>3.</b> Potwierdź instalację PADLETIC.</p>
          </div>
        ) : (
          <div className="install-steps">
            <p><b>1.</b> W {browserName()} poszukaj ikony instalacji przy pasku adresu albo w menu przeglądarki.</p>
            <p><b>2.</b> Wybierz <strong>„Zainstaluj PADLETIC”</strong> / <strong>„Zainstaluj aplikację”</strong>.</p>
            <p><b>3.</b> Jeśli opcja nie jest jeszcze widoczna, odśwież stronę i spróbuj ponownie.</p>
          </div>
        )}

        <small className="install-platform-note">Urządzenie: {platformText}. Instalacja wymaga HTTPS i obsługiwanej przeglądarki.</small>
        {status && <p className="install-status">{status}</p>}
        <button type="button" className="install-hint-ok" onClick={() => setShowHelp(false)}>Gotowe</button>
      </section>
    </div>,
    document.body
  );

  return <>{control}{help}</>;
}
