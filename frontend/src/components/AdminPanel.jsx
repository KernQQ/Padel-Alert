import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import PadleticSelect from "./ui/PadleticSelect";
import PadleticTimePicker from "./ui/PadleticTimePicker";

function sessionHeaders() {
  const token = localStorage.getItem("padelalert-session");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function statusLabel(status) {
  const labels = {
    open: "Otwarty",
    full: "Komplet",
    confirmed: "Potwierdzony",
    completed: "Zakończony",
    cancelled: "Anulowany"
  };
  return labels[status] || status;
}

export default function AdminPanel({ onChanged }) {
  const [tab, setTab] = useState("users");
  const [summary, setSummary] = useState(null);
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const headers = sessionHeaders();
      const [summaryRes, matchesRes, usersRes] = await Promise.all([
        apiFetch("/admin/summary", { headers }),
        apiFetch("/admin/matches", { headers }),
        apiFetch("/admin/users", { headers })
      ]);

      const [summaryData, matchesData, usersData] = await Promise.all([
        summaryRes.json(), matchesRes.json(), usersRes.json()
      ]);

      if (!summaryRes.ok) throw new Error(summaryData.message || "Brak dostępu do panelu admina.");
      if (!matchesRes.ok) throw new Error(matchesData.message || "Nie udało się pobrać meczów.");
      if (!usersRes.ok) throw new Error(usersData.message || "Nie udało się pobrać użytkowników.");

      setSummary(summaryData.summary);
      setMatches(matchesData.matches || []);
      setUsers(usersData.users || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateMatch(matchId, patch) {
    try {
      const response = await apiFetch(`/admin/matches/${matchId}`, {
        method: "PATCH",
        headers: { ...sessionHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się zapisać meczu.");
      setEditing(null);
      setMessage("Mecz zapisany.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteMatch(match) {
    if (!window.confirm(`Usunąć mecz ${match.clubName}, ${match.date} ${match.from}?`)) return;
    try {
      const response = await apiFetch(`/admin/matches/${match.id}`, {
        method: "DELETE",
        headers: sessionHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się usunąć meczu.");
      setMessage("Mecz usunięty.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeParticipant(match, participant) {
    if (!window.confirm(`Usunąć ${participant.nickname} z meczu?`)) return;
    try {
      const response = await apiFetch(`/admin/matches/${match.id}/participants/${encodeURIComponent(participant.joinedAt)}`, {
        method: "DELETE",
        headers: sessionHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się usunąć gracza.");
      setMessage("Gracz usunięty z meczu.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(error.message);
    }
  }


  async function deleteUser(user) {
    if (!window.confirm(`Usunąć konto ${user.nickname || user.email}? Zostaną usunięte także jego dane profilu i treści powiązane z kontem.`)) return;
    try {
      const response = await apiFetch(`/admin/users/${user.id}`, {
        method: "DELETE",
        headers: sessionHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się usunąć użytkownika.");
      setMessage(`Użytkownik ${user.nickname || user.email} został usunięty.`);
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function changeRole(userId, role) {
    try {
      const response = await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: { ...sessionHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się zmienić roli.");
      setMessage("Rola użytkownika została zmieniona.");
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const sortedMatches = useMemo(() => matches, [matches]);

  return (
    <div className="sport-admin">
      <header className="sport-page-head sport-page-head-action">
        <div><span>Admin</span><h1>Panel administratora</h1><p>Zarządzaj użytkownikami i meczami.</p></div>
        <button type="button" onClick={load}>Odśwież</button>
      </header>

      {message && <div className="sport-message">{message}</div>}

      <section className="sport-admin-stats">
        <div><strong>{summary?.users ?? "—"}</strong><span>użytkowników</span></div>
        <div><strong>{summary?.matches ?? "—"}</strong><span>wszystkich meczów</span></div>
        <div><strong>{summary?.activeMatches ?? "—"}</strong><span>aktywne mecze</span></div>
        <div><strong>{summary?.playersLooking ?? "—"}</strong><span>zgłoszeń graczy</span></div>
      </section>

      <nav className="sport-admin-tabs">
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Użytkownicy</button>
        <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>Mecze</button>
      </nav>

      {loading ? <div className="sport-loading">Ładowanie panelu…</div> : tab === "users" ? (
        <section className="sport-admin-table">
          <div className="head"><span>Użytkownik</span><span>Poziom</span><span>Lokalizacja</span><span>Rola</span><span>Akcje</span></div>
          {users.map((user) => (
            <article key={user.id}>
              <div><strong>{user.nickname || "Bez nicku"}</strong><small>{user.email}</small></div>
              <span>{user.level}</span><span>{user.city || "—"}</span>
              <PadleticSelect value={user.role} onChange={(event) => changeRole(user.id, event.target.value)}><option value="user">USER</option><option value="club_admin">CLUB_ADMIN</option><option value="admin">ADMIN</option></PadleticSelect>
              <button type="button" onClick={() => deleteUser(user)}>Usuń</button>
            </article>
          ))}
        </section>
      ) : (
        <section className="sport-admin-table sport-admin-matches">
          <div className="head"><span>Mecz</span><span>Termin</span><span>Skład</span><span>Status</span><span>Akcje</span></div>
          {sortedMatches.map((match) => (
            <article key={match.id}>
              <div><strong>{match.clubName}</strong><small>{match.owner?.nickname || "Organizator"}</small></div>
              <span>{match.date} · {match.from}</span><span>{match.participants?.length || 0}/{match.maxPlayers || 4}</span><span>{statusLabel(match.status)}</span>
              <div className="actions"><button onClick={() => setEditing({ ...match })}>Edytuj</button><button onClick={() => updateMatch(match.id,{status:match.status==="cancelled"?"open":"cancelled"})}>{match.status==="cancelled"?"Przywróć":"Anuluj"}</button><button onClick={() => deleteMatch(match)}>Usuń</button></div>
            </article>
          ))}
        </section>
      )}

      {editing && (
        <div className="admin-edit-backdrop" onClick={() => setEditing(null)}>
          <form className="admin-edit-modal" onSubmit={(event) => { event.preventDefault(); updateMatch(editing.id, editing); }} onClick={(event) => event.stopPropagation()}>
            <header><h2>Edytuj mecz</h2><button type="button" onClick={() => setEditing(null)}>×</button></header>
            <div className="admin-edit-grid">
              <label><span>Data</span><input type="date" value={editing.date || ""} onChange={(event) => setEditing({ ...editing, date:event.target.value })} /></label>
              <label><span>Od</span><PadleticTimePicker value={editing.from} onChange={(value) => setEditing({ ...editing, from:value })} /></label>
              <label><span>Do</span><PadleticTimePicker value={editing.to} onChange={(value) => setEditing({ ...editing, to:value })} /></label>
              <label><span>Status</span><PadleticSelect value={editing.status} onChange={(event) => setEditing({ ...editing, status:event.target.value })}><option value="open">Otwarty</option><option value="full">Komplet</option><option value="confirmed">Potwierdzony</option><option value="completed">Zakończony</option><option value="cancelled">Anulowany</option></PadleticSelect></label>
            </div>
            <button className="admin-save-button" type="submit">Zapisz</button>
          </form>
        </div>
      )}
    </div>
  );

}
