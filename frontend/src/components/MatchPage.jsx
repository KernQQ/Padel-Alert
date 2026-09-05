import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import MatchWizard from "./matches/MatchWizard";
import MatchCenter from "./matches/MatchCenter";
import LevelSelect from "./ui/LevelSelect";
import LevelBadge from "./ui/LevelBadge";
import MatchmakerPanel from "./MatchmakerPanel";
import { useRealtime } from "../hooks/useRealtime";
import PadleticSelect from "./ui/PadleticSelect";

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function MatchPage({
  ownerToken,
  clubs,
  profile,
  onChanged,
  createSignal = 0,
  createPrefill = null,
  onCreateConsumed,
  playNowSignal = 0
}) {
  const today = getToday();

  const [matches, setMatches] = useState([]);
  const [nowPlayers, setNowPlayers] = useState([]);
  const [chatUnread, setChatUnread] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [matchmakerPrefill, setMatchmakerPrefill] = useState(null);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (createSignal > 0) {
      setMatchmakerPrefill(createPrefill || null);
      setEditingMatchId(null);
      setShowWizard(true);
      onCreateConsumed?.();
    }
  }, [createSignal, createPrefill, onCreateConsumed]);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    clubSlug: "all",
    date: "",
    level: "all"
  });

  const load = useCallback(async () => {
    try {
      const headers = { "x-owner-token": ownerToken };
      const [matchesResponse, nowResponse, chatUnreadResponse] = await Promise.all([
        apiFetch("/matches?status=all", { headers }),
        apiFetch("/matches/now", { headers }),
        apiFetch("/matches/chat-unread", { headers })
      ]);

      const matchesData = await matchesResponse.json();
      const nowData = await nowResponse.json();
      const chatUnreadData = await chatUnreadResponse.json();

      if (!matchesResponse.ok) {
        throw new Error(matchesData.message || "Nie udało się pobrać meczów.");
      }

      setMatches(matchesData.matches || []);
      setNowPlayers(nowData.players || []);
      if (chatUnreadResponse.ok) setChatUnread(chatUnreadData.counts || {});

      if (selectedMatch) {
        const fresh = (matchesData.matches || []).find(
          (match) => match.id === selectedMatch.id
        );

        if (fresh) setSelectedMatch(fresh);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [ownerToken, selectedMatch?.id]);

  useRealtime({
    ownerToken,
    onMatchesChanged: () => {
      load();
      onChanged?.();
    }
  });

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const clubOk =
        filters.clubSlug === "all" ||
        match.clubSlug === "all" ||
        match.clubSlug === filters.clubSlug;

      const dateOk = !filters.date || match.date === filters.date;
      const levelOk =
        filters.level === "all" || match.level === filters.level;

      const archived = ["completed", "cancelled"].includes(match.status);

      return clubOk && dateOk && levelOk && (showArchive ? archived : !archived);
    });
  }, [matches, filters, showArchive]);

  const urgentMatches = filteredMatches
    .filter((match) => match.spotsLeft === 1 && match.status === "open")
    .slice(0, 3);

  const myNow = nowPlayers.find((player) => player.isMe);

  async function setPlayingNow() {
    const club = clubs.find(
      (item) => item.slug === (profile.favoriteClubSlug || "all")
    );

    const until = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const response = await apiFetch("/matches/now", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({
        nickname: profile.nickname,
        level: profile.level,
        preferredSide: profile.preferredSide,
        clubSlug: profile.favoriteClubSlug || "all",
        clubName:
          profile.favoriteClubSlug === "all"
            ? "Dowolny klub"
            : club?.name || "Dowolny klub",
        availableUntil: until.toISOString()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się włączyć „Gram teraz”.");
      return;
    }

    setMessage("Jesteś widoczny jako dostępny przez najbliższe 2 godziny.");
    load();
  }

  async function stopPlayingNow() {
    await apiFetch("/matches/now", {
      method: "DELETE",
      headers: {
        "x-owner-token": ownerToken
      }
    });

    setMessage("Status „Gram teraz” został wyłączony.");
    load();
  }

  async function joinMatch(match) {
    const response = await apiFetch(`/matches/${match.id}/join`, {
      method: "POST",
      headers: {
        "x-owner-token": ownerToken
      }
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się dołączyć.");
      return;
    }

    setMessage(
      data.waitlisted
        ? "Mecz jest pełny — trafiłeś na listę oczekujących."
        : "Dołączyłeś do meczu."
    );

    if (data.match) setSelectedMatch(data.match);

    await load();
    onChanged?.();
  }

  async function leaveMatch(match) {
    const response = await apiFetch(`/matches/${match.id}/leave`, {
      method: "POST",
      headers: {
        "x-owner-token": ownerToken
      }
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się opuścić meczu.");
      return;
    }

    setMessage("Opuściłeś mecz.");
    if (data.match) setSelectedMatch(data.match);
    await load();
    onChanged?.();
  }

  async function changeStatus(match, status) {
    const response = await apiFetch(`/matches/${match.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się zmienić statusu.");
      return;
    }

    setSelectedMatch(data.match);
    await load();
    onChanged?.();
  }


  async function setReadiness(match, ready) {
    const response = await apiFetch(`/matches/${match.id}/readiness`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({ ready })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się zmienić gotowości.");
      return;
    }

    setSelectedMatch(data.match);
    setMessage(ready ? "Gotowość potwierdzona ✓" : "Gotowość wyłączona.");
    await load();
    onChanged?.();
  }

  function editMatch(match) {
    setEditingMatchId(match.id);
    setMatchmakerPrefill({
      clubSlug: match.clubSlug,
      date: match.date,
      from: match.from,
      to: match.to,
      courtId: match.courtId,
      courtName: match.courtName,
      courtType: match.courtType,
      reservationUrl: match.reservationUrl,
      level: match.level,
      gameType: match.gameType,
      note: match.note,
      editMode: true
    });
    setSelectedMatch(null);
    setShowWizard(true);
  }

  useEffect(() => {
    if (playNowSignal > 0) {
      setPlayingNow();
    }
    // setPlayingNow intentionally uses current profile/club state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playNowSignal]);

  async function removeParticipant(match, player) {
    const confirmed = window.confirm(
      `Usunąć gracza ${player.nickname} z tego meczu?`
    );

    if (!confirmed) return;

    const response = await apiFetch(
      `/matches/${match.id}/participants/${encodeURIComponent(
        player.participantKey
      )}`,
      {
        method: "DELETE",
        headers: {
          "x-owner-token": ownerToken
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Nie udało się usunąć gracza.");
      return;
    }

    setMessage(`${player.nickname} został usunięty ze składu.`);
    setSelectedMatch(data.match);
    await load();
    onChanged?.();
  }

  return (
    <>
      <section className="sport-matches">
        <header className="sport-page-head sport-page-head-action">
          <div>
            <span>Mecze</span>
            <h1>Mecze</h1>
            <p>Graj. Dołącz. Poznaj ludzi.</p>
          </div>
          <button type="button" onClick={() => { setMatchmakerPrefill(null); setShowWizard(true); }}>+ Utwórz mecz</button>
        </header>

        <div className="sport-match-tabs">
          <button className={!showArchive ? "active" : ""} onClick={() => setShowArchive(false)}>Nadchodzące</button>
          <button onClick={() => setFilters({ ...filters, date: "" })}>Wszystkie</button>
          <button className={showArchive ? "active" : ""} onClick={() => setShowArchive(true)}>Historia</button>
          <label><input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
        </div>

        {message && <button className="sport-message" onClick={() => setMessage("")}>{message} ×</button>}

        {myNow ? (
          <button className="sport-now sport-now-active" onClick={stopPlayingNow}>● Gram teraz — wyłącz</button>
        ) : (
          <button className="sport-now" onClick={setPlayingNow}>● Gram teraz</button>
        )}

        <section className="sport-fixtures">
          {loading ? (
            <div className="sport-loading">Ładowanie meczów…</div>
          ) : filteredMatches.length > 0 ? filteredMatches.map((match) => (
            <article key={match.id} className="sport-fixture ref-match-row">
              <div className="ref-match-date">
                <strong>{String(match.date || "").slice(8, 10) || "—"}</strong>
                <span>{match.date ? new Date(`${match.date}T12:00:00`).toLocaleDateString("pl-PL", { month: "short" }).toUpperCase().replace(".", "") : ""}</span>
                <time>{match.from}</time>
              </div>
              <div className="ref-match-main">
                <h2>{match.clubName}</h2>
                <p>{match.owner?.nickname || match.participants?.[0]?.nickname || "Organizator"}</p>
                <small>{match.participants?.length || 0}/{match.maxPlayers || 4}</small>
              </div>
              <div className="ref-match-action">
                {!match.isJoined && !match.isWaiting && (match.status === "open" || match.status === "full") ? (
                  <button className="primary" onClick={() => joinMatch(match)}>{match.status === "full" ? "Lista" : "Dołącz →"}</button>
                ) : (
                  <button onClick={() => setSelectedMatch(match)}>Szczegóły →</button>
                )}
              </div>
            </article>
          )) : (
            <div className="sport-empty"><strong>{showArchive ? "Historia jest pusta." : "Brak meczów."}</strong><p>Utwórz mecz i zaproś graczy.</p><button onClick={() => setShowWizard(true)}>Utwórz mecz →</button></div>
          )}
        </section>
      </section>

      <button className="match-floating-action" onClick={() => setShowWizard(true)} title="Utwórz mecz">＋</button>

      {showWizard && (
        <MatchWizard
          initialData={matchmakerPrefill}
          clubs={clubs}
          profile={profile}
          ownerToken={ownerToken}
          onClose={() => {
            setShowWizard(false);
            setMatchmakerPrefill(null);
            setEditingMatchId(null);
          }}
          onCreated={async (match) => {
            setShowWizard(false);
            setMatchmakerPrefill(null);
            setEditingMatchId(null);
            setSelectedMatch(match);
            await load();
            onChanged?.();
          }}
        />
      )}

      {selectedMatch && (
        <MatchCenter
          match={selectedMatch}
          ownerToken={ownerToken}
          onClose={() => setSelectedMatch(null)}
          onJoin={() => joinMatch(selectedMatch)}
          onLeave={() => leaveMatch(selectedMatch)}
          onStatus={(status) => changeStatus(selectedMatch, status)}
          onRemoveParticipant={(player) =>
            removeParticipant(selectedMatch, player)
          }
          onReadiness={(ready) =>
            setReadiness(selectedMatch, ready)
          }
          onEdit={() => editMatch(selectedMatch)}
          onChatRead={() => setChatUnread((current) => ({ ...current, [selectedMatch.id]: 0 }))}
        />
      )}
    </>
  );
}

export default MatchPage;
