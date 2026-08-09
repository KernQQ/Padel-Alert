import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { getMatchScore, normalizeLevel } from "../utils/levels";
import LevelBadge from "./ui/LevelBadge";
import { useRealtime } from "../hooks/useRealtime";

function SmartLobby({
  ownerToken,
  clubs,
  profile,
  unreadNotificationsCount,
  onOpenMatches,
  onOpenCourts,
  onOpenNotifications
}) {
  const [matches, setMatches] = useState([]);
  const [nowPlayers, setNowPlayers] = useState([]);
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const headers = { "x-owner-token": ownerToken };

      const [matchesResponse, nowResponse] = await Promise.all([
        apiFetch("/matches?status=all", { headers }),
        apiFetch("/matches/now", { headers })
      ]);

      const matchesData = await matchesResponse.json();
      const nowData = await nowResponse.json();

      if (matchesResponse.ok) {
        setMatches(matchesData.matches || []);
      }

      if (nowResponse.ok) {
        setNowPlayers(nowData.players || []);
      }
    } catch {
      // Lobby nie blokuje pozostałej aplikacji.
    }
  }, [ownerToken]);

  useRealtime({
    ownerToken,
    onMatchesChanged: load
  });

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const activeMatches = matches.filter((match) =>
    ["open", "full", "confirmed"].includes(match.status)
  );

  const urgentMatches = activeMatches.filter(
    (match) => match.status === "open" && match.spotsLeft === 1
  );

  const recommended = useMemo(() => {
    return activeMatches
      .filter((match) => !match.isJoined && !match.isWaiting)
      .map((match) => ({
        ...match,
        smartScore: getMatchScore({
          playerLevel: profile.level,
          matchLevel: match.level,
          favoriteClubSlug: profile.favoriteClubSlug,
          clubSlug: match.clubSlug,
          preferredSide: profile.preferredSide
        })
      }))
      .sort((first, second) => second.smartScore - first.smartScore)
      .slice(0, 3);
  }, [activeMatches, profile]);

  const myMatches = activeMatches
    .filter((match) => match.isJoined)
    .slice(0, 3);

  const clubActivity = useMemo(() => {
    return clubs
      .map((club) => {
        const clubMatches = activeMatches.filter(
          (match) => match.clubSlug === club.slug
        );
        const clubNow = nowPlayers.filter(
          (player) => player.clubSlug === club.slug
        );

        return {
          ...club,
          activity: clubMatches.length * 2 + clubNow.length,
          matches: clubMatches.length,
          now: clubNow.length
        };
      })
      .sort((first, second) => second.activity - first.activity)[0];
  }, [clubs, activeMatches, nowPlayers]);

  async function quickJoin(match) {
    setBusyMatchId(match.id);
    setMessage("");

    try {
      const response = await apiFetch(`/matches/${match.id}/join`, {
        method: "POST",
        headers: {
          "x-owner-token": ownerToken
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Nie udało się dołączyć.");
      }

      setMessage(
        data.waitlisted
          ? "Mecz jest pełny — jesteś na liście oczekujących."
          : "Gotowe — dołączyłeś do meczu."
      );

      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyMatchId(null);
    }
  }

  return (
    <section className="smart-lobby">
      <div className="smart-lobby-top">
        <div>
          <span className="section-kicker">CO CHCESZ ZROBIĆ DZISIAJ?</span>
          <h2>Znajdź mecz lub ekipę w kilka sekund.</h2>
          <p>
            Korty, gracze i mecze — najważniejsze rzeczy od razu pod ręką.
          </p>
        </div>

        <div className="smart-live-pill">
          <span className="live-dot" />
          LIVE · {nowPlayers.length} dostępnych teraz
        </div>
      </div>

      {message && (
        <button
          type="button"
          className="smart-lobby-message"
          onClick={() => setMessage("")}
        >
          {message}
          <span>×</span>
        </button>
      )}

      <div className="smart-lobby-actions">
        <button type="button" onClick={onOpenMatches}>
          <span>🎾</span>
          <strong>Znajdź ekipę</strong>
          <small>Matchmaking + {activeMatches.length} aktywnych meczów</small>
        </button>

        <button type="button" onClick={onOpenMatches}>
          <span>🔥</span>
          <strong>Brakuje jednej osoby</strong>
          <small>{urgentMatches.length} meczów 3/4</small>
        </button>

        <button type="button" onClick={onOpenCourts}>
          <span>◫</span>
          <strong>Znajdź kort</strong>
          <small>Sprawdź dostępność BO5</small>
        </button>

        <button type="button" onClick={onOpenNotifications}>
          <span>🔔</span>
          <strong>Powiadomienia</strong>
          <small>{unreadNotificationsCount} nowych</small>
        </button>
      </div>

      {urgentMatches.length > 0 && (
        <div className="smart-lobby-section smart-urgent-section">
          <div className="smart-section-heading">
            <div>
              <span className="section-kicker">NAJSZYBSZA DROGA DO GRY</span>
              <h3>Brakuje tylko jednego gracza</h3>
            </div>
            <button type="button" onClick={onOpenMatches}>
              Wszystkie →
            </button>
          </div>

          <div className="smart-urgent-grid">
            {urgentMatches.slice(0, 2).map((match) => (
              <article key={match.id}>
                <div>
                  <span className="smart-urgent-label">🔥 3/4</span>
                  <strong>{match.from}–{match.to}</strong>
                  <h4>{match.clubName}</h4>
                  <LevelBadge level={match.level} compact />
                </div>

                <button
                  type="button"
                  disabled={busyMatchId === match.id}
                  onClick={() => quickJoin(match)}
                >
                  {busyMatchId === match.id ? "Dołączam..." : "Dołącz teraz"}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="smart-lobby-columns">
        <div className="smart-lobby-section">
          <div className="smart-section-heading">
            <div>
              <span className="section-kicker">SMART MATCH</span>
              <h3>Polecane dla Ciebie</h3>
            </div>
          </div>

          <div className="smart-match-list">
            {recommended.length > 0 ? (
              recommended.map((match, index) => (
                <article key={match.id}>
                  <span className="smart-rank">#{index + 1}</span>

                  <div className="smart-match-main">
                    <div>
                      <strong>{match.clubName}</strong>
                      <small>
                        {match.date} · {match.from}–{match.to}
                      </small>
                    </div>

                    <LevelBadge level={match.level} compact />
                  </div>

                  <div className="smart-match-score">
                    <strong>{match.smartScore}%</strong>
                    <small>dopasowania</small>
                  </div>

                  <button
                    type="button"
                    disabled={busyMatchId === match.id}
                    onClick={() => quickJoin(match)}
                  >
                    {match.status === "full" ? "Kolejka" : "Dołącz"}
                  </button>
                </article>
              ))
            ) : (
              <div className="smart-empty">
                Na razie brak pasujących meczów. Możesz utworzyć własny.
              </div>
            )}
          </div>
        </div>

        <div className="smart-lobby-section">
          <div className="smart-section-heading">
            <div>
              <span className="section-kicker">TWÓJ DZIEŃ</span>
              <h3>Twoje mecze</h3>
            </div>
          </div>

          <div className="smart-my-matches">
            {myMatches.length > 0 ? (
              myMatches.map((match) => (
                <button
                  type="button"
                  key={match.id}
                  onClick={onOpenMatches}
                >
                  <span>{match.date}</span>
                  <strong>{match.from} · {match.clubName}</strong>
                  <small>
                    {match.playersCount}/{match.maxPlayers} graczy
                  </small>
                </button>
              ))
            ) : (
              <div className="smart-empty">
                Nie masz jeszcze zaplanowanego meczu.
              </div>
            )}
          </div>

          {clubActivity && (
            <div className="smart-club-of-day">
              <span>🔥 Najwięcej dzieje się teraz</span>
              <strong>{clubActivity.name}</strong>
              <small>
                {clubActivity.matches} meczów · {clubActivity.now} dostępnych teraz
              </small>
            </div>
          )}
        </div>
      </div>

      <div className="smart-profile-hint">
        <div>
          <span className="section-kicker">TWÓJ POZIOM</span>
          <strong>{normalizeLevel(profile.level)}</strong>
        </div>
        <p>
          Smart Match wykorzystuje Twój poziom, ulubiony klub i aktywność
          meczu do ustawiania rekomendacji.
        </p>
      </div>
    </section>
  );
}

export default SmartLobby;
