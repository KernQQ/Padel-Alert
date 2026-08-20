import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";

export default function AccountPanel({
  user,
  anonymousToken,
  onAuthenticated,
  onLogout,
  onOpenProfile
}) {
  const [mode, setMode] = useState("login");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nickname: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    // Zamykanie kliknięciem poza element działa tylko dla menu
    // zalogowanego użytkownika. Gdy user === null, open oznacza modal
    // logowania/rejestracji i globalny pointerdown nie może go zamykać.
    if (!user || !open) {
      return undefined;
    }

    function closeMenu(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [user, open]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await apiFetch(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          anonymousToken: mode === "register" ? anonymousToken : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Nie udało się zalogować.");
      }

      localStorage.setItem("padelalert-session", data.token);
      await onAuthenticated(data.user, data.token);
      setOpen(false);
      setForm({ email: "", password: "", nickname: "" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="account-menu" ref={menuRef}>
        <button
          type="button"
          className="account-trigger"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Menu konta"
        >
          <span className="account-avatar">
            {(user.nickname || user.email || "P").slice(0, 1).toUpperCase()}
          </span>
          <span className="account-trigger-copy">
            <strong>{user.nickname || "Gracz"}</strong>
            <small>Konto</small>
          </span>
          <span className="account-chevron">⌄</span>
        </button>

        {open && (
          <div className="account-dropdown">
            <div className="account-dropdown-user">
              <span className="account-avatar large">
                {(user.nickname || user.email || "P").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{user.nickname || "Gracz"}</strong>
                <small>{user.email}</small>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenProfile?.();
                setOpen(false);
              }}
            >
              Profil i moje
            </button>

            <button
              type="button"
              className="account-logout"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              Wyloguj
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="account-login-button"
        onClick={() => setOpen(true)}
      >
        Zaloguj
      </button>

      {open && (
        <div
          className="account-modal-backdrop"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="account-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="account-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>

            <span className="section-kicker">Konto PadelAlert</span>
            <h2>{mode === "login" ? "Zaloguj się" : "Załóż konto"}</h2>
            <p>
              Zachowaj mecze, profil, alerty i zapisane wyszukiwania na każdym
              urządzeniu.
            </p>

            <form onSubmit={submit}>
              {mode === "register" && (
                <label>
                  Nick
                  <input
                    value={form.nickname}
                    onChange={(event) =>
                      setForm({ ...form, nickname: event.target.value })
                    }
                    required
                    minLength="2"
                  />
                </label>
              )}

              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Hasło
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  required
                  minLength="8"
                />
              </label>

              {message && <div className="account-error">{message}</div>}

              <button className="account-submit" disabled={busy}>
                {busy
                  ? "Chwila..."
                  : mode === "login"
                  ? "Zaloguj"
                  : "Utwórz konto"}
              </button>
            </form>

            <button
              className="account-switch"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login"
                ? "Nie masz konta? Załóż je"
                : "Masz konto? Zaloguj się"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
