import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";

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
  const [tab, setTab] = useState("matches");
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
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">Administrator</span>
          <h1>Panel administratora</h1>
          <p>Zarządzaj użytkownikami i wszystkimi meczami w PADLETIC.</p>
        </div>
        <button type="button" onClick={load}>Odśwież</button>
      </header>

      {message && <div className="admin-message">{message}</div>}

      <section className="admin-metrics">
        <article><strong>{summary?.users ?? "—"}</strong><small>użytkowników</small></article>
        <article><strong>{summary?.matches ?? "—"}</strong><small>wszystkich meczów</small></article>
        <article><strong>{summary?.activeMatches ?? "—"}</strong><small>aktywnych meczów</small></article>
        <article><strong>{summary?.playersLooking ?? "—"}</strong><small>zgłoszeń graczy</small></article>
      </section>

      <div className="admin-tabs">
        <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>Mecze</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Użytkownicy</button>
      </div>

      {loading && <div className="admin-empty">Ładowanie panelu…</div>}

      {!loading && tab === "matches" && (
        <section className="admin-list">
          {sortedMatches.map((match) => (
            <article className="admin-match-card" key={match.id}>
              <div className="admin-match-main">
                <div className="admin-match-title">
                  <div>
                    <strong>{match.clubName}</strong>
                    <small>{match.date} · {match.from}–{match.to} · {statusLabel(match.status)}</small>
                  </div>
                  <span>{match.participants?.length || 0}/{match.maxPlayers || 4}</span>
                </div>

                <div className="admin-match-owner">
                  Organizator: <b>{match.owner?.nickname || "Nieznany"}</b>
                  {match.owner?.email && <small>{match.owner.email}</small>}
                </div>

                <div className="admin-participants">
                  {(match.participants || []).map((participant) => (
                    <div key={participant.joinedAt}>
                      <span>{participant.nickname}</span>
                      <small>{participant.level} · {participant.role === "organizer" ? "organizator" : "gracz"}</small>
                      {participant.role !== "organizer" && (
                        <button type="button" onClick={() => removeParticipant(match, participant)}>Usuń</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-match-actions">
                <button type="button" onClick={() => setEditing({ ...match })}>Edytuj</button>
                <button type="button" onClick={() => updateMatch(match.id, { status: match.status === "cancelled" ? "open" : "cancelled" })}>
                  {match.status === "cancelled" ? "Przywróć" : "Anuluj"}
                </button>
                <button type="button" className="danger" onClick={() => deleteMatch(match)}>Usuń mecz</button>
              </div>
            </article>
          ))}
          {sortedMatches.length === 0 && <div className="admin-empty">Brak meczów.</div>}
        </section>
      )}

      {!loading && tab === "users" && (
        <section className="admin-user-list">
          {users.map((user) => (
            <article key={user.id}>
              <div>
                <strong>{user.nickname || "Bez nicku"}</strong>
                <small>{user.email}</small>
                <small>Poziom {user.level} · {user.city}</small>
              </div>
              <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}>
                <option value="user">USER</option>
                <option value="club_admin">CLUB_ADMIN</option>
                <option value="admin">ADMIN</option>
              </select>
            </article>
          ))}
        </section>
      )}

      {editing && (
        <div className="admin-modal-backdrop" onMouseDown={() => setEditing(null)}>
          <form className="admin-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => {
            e.preventDefault();
            updateMatch(editing.id, {
              clubName: editing.clubName,
              clubSlug: editing.clubSlug,
              date: editing.date,
              from: editing.from,
              to: editing.to,
              level: editing.level,
              gameType: editing.gameType,
              note: editing.note,
              status: editing.status,
              maxPlayers: Number(editing.maxPlayers)
            });
          }}>
            <button className="admin-modal-close" type="button" onClick={() => setEditing(null)}>×</button>
            <h2>Edytuj mecz</h2>
            <label>Klub<input value={editing.clubName || ""} onChange={(e) => setEditing({ ...editing, clubName: e.target.value })} /></label>
            <div className="admin-modal-grid">
              <label>Data<input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
              <label>Od<input type="time" value={editing.from || ""} onChange={(e) => setEditing({ ...editing, from: e.target.value })} /></label>
              <label>Do<input type="time" value={editing.to || ""} onChange={(e) => setEditing({ ...editing, to: e.target.value })} /></label>
              <label>Maks. graczy<input type="number" min="2" max="8" value={editing.maxPlayers || 4} onChange={(e) => setEditing({ ...editing, maxPlayers: e.target.value })} /></label>
              <label>Status<select value={editing.status || "open"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}><option value="open">Otwarty</option><option value="full">Komplet</option><option value="confirmed">Potwierdzony</option><option value="completed">Zakończony</option><option value="cancelled">Anulowany</option></select></label>
              <label>Poziom<input value={editing.level || ""} onChange={(e) => setEditing({ ...editing, level: e.target.value })} /></label>
            </div>
            <label>Typ gry<input value={editing.gameType || ""} onChange={(e) => setEditing({ ...editing, gameType: e.target.value })} /></label>
            <label>Opis<textarea rows="4" value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></label>
            <button className="admin-save" type="submit">Zapisz zmiany</button>
          </form>
        </div>
      )}
    </div>
  );
}
