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
      <MatchmakerPanel
        ownerToken={ownerToken}
        clubs={clubs}
        profile={profile}
        onCreateMatch={(prefill) => {
          setMatchmakerPrefill(prefill);
          setShowWizard(true);
        }}
      />

      <section className="matches-page-heading">
        <div>
          <span className="eyebrow">MATCH ENGINE</span>
          <h1>Znajdź mecz. Albo go stwórz.</h1>
          <p>
            Dołącz do istniejącej gry, znajdź brakującego zawodnika albo
            pokaż, że jesteś dostępny teraz.
          </p>
        </div>

        <div className="matches-heading-actions">
          {myNow ? (
            <button className="now-active-button" onClick={stopPlayingNow}>
              <span className="live-dot" />
              Gram teraz — wyłącz
            </button>
          ) : (
            <button className="now-button" onClick={setPlayingNow}>
              ⚡ Gram teraz
            </button>
          )}

          <button
            className="create-match-button"
            onClick={() => {
              setMatchmakerPrefill(null);
              setShowWizard(true);
            }}
          >
            ＋ Utwórz mecz
          </button>
        </div>
      </section>

      {message && (
        <button
          className="match-inline-message"
          onClick={() => setMessage("")}
        >
          {message}
          <span>×</span>
        </button>
      )}

      <section className="matches-stats">
        <article>
          <span></span>
          <div>
            <strong>
              {
                matches.filter(
                  (match) =>
                    match.status === "open" || match.status === "full"
                ).length
              }
            </strong>
            <small>aktywnych meczów</small>
          </div>
        </article>

        <article>
          <span></span>
          <div>
            <strong>{urgentMatches.length}</strong>
            <small>meczów 3/4</small>
          </div>
        </article>

        <article>
          <span>⚡</span>
          <div>
            <strong>{nowPlayers.length}</strong>
            <small>graczy „Gram teraz”</small>
          </div>
        </article>

        <article>
          <span>✓</span>
          <div>
            <strong>
              {matches.filter((match) => match.isJoined).length}
            </strong>
            <small>Twoich meczów</small>
          </div>
        </article>
      </section>

      {urgentMatches.length > 0 && (
        <section className="urgent-match-section">
          <div className="match-section-heading">
            <div>
              <span className="section-kicker">Szybka okazja</span>
              <h2>Brakuje tylko jednej osoby</h2>
            </div>
          </div>

          <div className="urgent-match-grid">
            {urgentMatches.map((match) => (
              <article key={match.id} className="urgent-match-card">
                <span className="urgent-flame"></span>

                <div>
                  <strong>
                    {match.from}–{match.to}
                  </strong>
                  <h3>{match.clubName}</h3>
                  <p>
                    {match.level} · {match.gameType}
                  </p>
                </div>

                <div className="urgent-player-count">
                  <strong>{match.playersCount}/4</strong>
                  <small>skład</small>
                </div>

                <button onClick={() => joinMatch(match)}>Dołącz</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="now-players-section">
        <div className="match-section-heading">
          <div>
            <span className="section-kicker">Na żywo</span>
            <h2>Dostępni teraz</h2>
          </div>

          <span className="live-count">
            <span className="live-dot" />
            {nowPlayers.length} aktywnych
          </span>
        </div>

        {nowPlayers.length > 0 ? (
          <div className="now-player-strip">
            {nowPlayers.map((player, index) => (
              <article key={`${player.nickname}-${index}`}>
                <span className="now-avatar">
                  {player.nickname.slice(0, 1).toUpperCase()}
                </span>

                <div>
                  <strong>{player.nickname}</strong>
                  <small>
                    {player.level} · {player.clubName}
                  </small>
                </div>

                {player.isMe && <span className="my-now-badge">Ty</span>}
              </article>
            ))}
          </div>
        ) : (
          <div className="matches-empty-mini">
            Nikt nie zaznaczył jeszcze „Gram teraz”.
          </div>
        )}
      </section>

      <section className="matches-filter-panel">
        <label>
          <span>Klub</span>
          <PadleticSelect
            value={filters.clubSlug}
            onChange={(event) =>
              setFilters({ ...filters, clubSlug: event.target.value })
            }
          >
            <option value="all">Wszystkie kluby</option>
            {clubs.map((club) => (
              <option key={club.slug} value={club.slug}>
                {club.name}
              </option>
            ))}
          </PadleticSelect>
        </label>

        <label>
          <span>Data</span>
          <input
            type="date"
            min={today}
            value={filters.date}
            onChange={(event) =>
              setFilters({ ...filters, date: event.target.value })
            }
          />
        </label>

        <label>
          <span>Poziom</span>
          <LevelSelect
            includeAll
            value={filters.level}
            onChange={(value) =>
              setFilters({ ...filters, level: value })
            }
          />
        </label>

        <button
          onClick={() =>
            setFilters({
              clubSlug: "all",
              date: "",
              level: "all"
            })
          }
        >
          Wyczyść
        </button>
      </section>

      <div className="match-archive-switch">
        <button
          type="button"
          className={!showArchive ? "active" : ""}
          onClick={() => setShowArchive(false)}
        >
          Aktywne
        </button>
        <button
          type="button"
          className={showArchive ? "active" : ""}
          onClick={() => setShowArchive(true)}
        >
          Archiwum
        </button>
      </div>

      <section className="all-matches-section">
        <div className="match-section-heading">
          <div>
            <span className="section-kicker">Mecze</span>
            <h2>
              {filteredMatches.length}{" "}
              {filteredMatches.length === 1 ? "mecz" : "meczów"}
            </h2>
          </div>

          <button className="refresh-matches-button" onClick={load}>
            ↻ Odśwież
          </button>
        </div>

        {loading ? (
          <div className="match-loading-grid">
            {[1, 2, 3].map((item) => (
              <div key={item} className="match-skeleton" />
            ))}
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="match-card-grid">
            {filteredMatches.map((match) => (
              <article
                key={match.id}
                className={`match-card match-status-${match.status}`}
              >
                <header>
                  <div>
                    <span className="match-status-pill">
                      {match.status === "full"
                        ? "Komplet"
                        : match.status === "confirmed"
                        ? "Potwierdzony"
                        : match.status === "completed"
                        ? "Zakończony"
                        : "Szukamy graczy"}
                    </span>

                    <h3>
                      {match.from}–{match.to}
                    </h3>
                  </div>

                  <div className="match-capacity">
                    <strong>
                      {match.playersCount}/{match.maxPlayers}
                    </strong>
                    <small>graczy</small>
                  </div>
                </header>

                <div className="match-club">
                  <span>📍</span>
                  <div>
                    <strong>{match.clubName}</strong>
                    <small>{match.date}</small>
                  </div>
                </div>

                <div className="match-tags">
                  <LevelBadge level={match.level} compact />
                  <span> {match.gameType}</span>
                  {match.spotsLeft > 0 && (
                    <span> Brakuje {match.spotsLeft}</span>
                  )}
                </div>

                <div className="match-player-dots">
                  {Array.from({ length: match.maxPlayers }).map(
                    (_, index) => {
                      const player = match.participants[index];

                      return (
                        <span
                          key={index}
                          className={player ? "filled" : ""}
                          title={player?.nickname || "Wolne miejsce"}
                        >
                          {player
                            ? player.nickname.slice(0, 1).toUpperCase()
                            : "＋"}
                        </span>
                      );
                    }
                  )}
                </div>

                {match.note && <p className="match-note">{match.note}</p>}

                <div className="match-card-actions">
                  <button
                    className="match-details-button"
                    onClick={() => setSelectedMatch(match)}
                  >
                    Centrum meczu
                    {chatUnread[match.id] > 0 && (
                      <span className="match-chat-unread-badge">{chatUnread[match.id] > 9 ? "9+" : chatUnread[match.id]}</span>
                    )}
                  </button>

                  {!match.isJoined &&
                    !match.isWaiting &&
                    (match.status === "open" || match.status === "full") && (
                      <button
                        className="match-join-button"
                        onClick={() => joinMatch(match)}
                      >
                        {match.status === "full"
                          ? "Lista oczekujących"
                          : "Dołącz"}
                      </button>
                    )}

                  {match.isJoined && !match.isOwner && (
                    <button
                      className="match-leave-button"
                      onClick={() => leaveMatch(match)}
                    >
                      Opuść
                    </button>
                  )}

                  {match.isWaiting && (
                    <span className="waiting-label">
                      Na liście oczekujących
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="matches-empty-state">
            <span></span>
            <h2>{showArchive ? "Archiwum jest puste" : "Nie ma jeszcze pasujących meczów"}</h2>
            <p>
              {showArchive
                ? "Zakończone i anulowane mecze pojawią się tutaj automatycznie."
                : "Utwórz pierwszy mecz albo zaznacz „Gram teraz”."}
            </p>
            {!showArchive && (
              <button onClick={() => setShowWizard(true)}>
                Utwórz mecz
              </button>
            )}
          </div>
        )}
      </section>

      <button
        className="match-floating-action"
        onClick={() => setShowWizard(true)}
        title="Utwórz mecz"
      >
        ＋
      </button>

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
