import { useState } from "react";
import { apiFetch } from "../services/api";

export default function AccountPanel({ user, anonymousToken, onAuthenticated, onLogout }) {
  const [mode, setMode] = useState("login");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email:"", password:"", nickname:"" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch(`/auth/${mode}`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          ...form,
          anonymousToken: mode === "register" ? anonymousToken : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się zalogować.");
      localStorage.setItem("padelalert-session", data.token);
      await onAuthenticated(data.user, data.token);
      setOpen(false);
      setForm({email:"",password:"",nickname:""});
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="account-chip">
        <span className="account-avatar">{(user.nickname || user.email || "P").slice(0,1).toUpperCase()}</span>
        <span><strong>{user.nickname || "Gracz"}</strong><small>{user.email}</small></span>
        <button onClick={onLogout}>Wyloguj</button>
      </div>
    );
  }

  return (
    <>
      <button className="account-login-button" onClick={() => setOpen(true)}>
        Konto
      </button>
      {open && (
        <div className="account-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="account-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="account-close" onClick={() => setOpen(false)}>×</button>
            <span className="section-kicker">PADELALERT ACCOUNT</span>
            <h2>{mode === "login" ? "Zaloguj się" : "Załóż konto"}</h2>
            <p>Twoje mecze i profil będą przypisane do jednego konta także na innym urządzeniu.</p>
            <form onSubmit={submit}>
              {mode === "register" && (
                <label>Nick<input value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})} required minLength="2" /></label>
              )}
              <label>E-mail<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></label>
              <label>Hasło<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength="8" /></label>
              {message && <div className="account-error">{message}</div>}
              <button className="account-submit" disabled={busy}>{busy ? "Chwila..." : mode === "login" ? "Zaloguj" : "Utwórz konto"}</button>
            </form>
            <button className="account-switch" onClick={() => {setMode(mode==="login"?"register":"login");setMessage("");}}>
              {mode === "login" ? "Nie masz konta? Załóż je" : "Masz konto? Zaloguj się"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
