import { useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import LevelBadge from "./ui/LevelBadge";

function todayIso() {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

function MatchmakerPanel({
  ownerToken,
  clubs = [],
  profile,
  onCreateMatch
}) {
  const [form, setForm] = useState({
    date: todayIso(),
    from: "18:00",
    to: "22:00",
    clubSlug: "",
    duration: 90
  });

  const [players, setPlayers] = useState([]);
  const [readyMatches, setReadyMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");

  const bestPlayers = useMemo(
    () => players.slice(0, 6),
    [players]
  );

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function search() {
    setLoading(true);
    setMessage("");

    try {
      const query = new URLSearchParams({
        date: form.date,
        from: form.from,
        to: form.to,
        duration: String(form.duration)
      });

      if (form.clubSlug) {
        query.set("clubSlug", form.clubSlug);
      }

      const response = await apiFetch(
        `/matchmaking/ready?${query.toString()}`,
        {
          headers: {
            "x-owner-token": ownerToken
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Nie udało się złożyć propozycji meczu."
        );
      }

      setPlayers(data.candidates || []);
      setReadyMatches(data.readyMatches || []);
      setSearched(true);

      if ((data.availabilityErrors || []).length > 0) {
        setMessage(
          "Część klubów BO5 chwilowo nie odpowiedziała. Pokazuję pozostałe wyniki."
        );
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function createFromReady(ready) {
    onCreateMatch?.({
      clubSlug: ready.clubSlug,
      date: ready.date,
      from: ready.from,
      to: ready.to,
      duration: ready.duration,
      courtId: ready.courtId,
      courtName: ready.courtName,
      courtType: ready.courtType,
      reservationUrl: ready.reservationUrl,
      suggestedPlayers: ready.players
    });
  }

  return (
    <section className="matchmaker-panel">
      <div className="matchmaker-heading">
        <div>
          <span className="section-kicker">
            PropozycjeMAKING
          </span>
          <h2>Złóż mi mecz.</h2>
          <p>
            PADLETIC łączy teraz trzy rzeczy naraz:
            Twój poziom, dostępnych graczy oraz prawdziwe
            wolne korty z BO5.
          </p>
        </div>

        <div className="matchmaker-my-level">
          <small>Twój poziom</small>
          <LevelBadge level={profile?.level} compact plain />
        </div>
      </div>

      <div className="matchmaker-form">
        <label>
          <span>Data</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              update("date", event.target.value)
            }
          />
        </label>

        <label>
          <span>Od</span>
          <input
            type="time"
            value={form.from}
            onChange={(event) =>
              update("from", event.target.value)
            }
          />
        </label>

        <label>
          <span>Do</span>
          <input
            type="time"
            value={form.to}
            onChange={(event) =>
              update("to", event.target.value)
            }
          />
        </label>

        <label>
          <span>Czas gry</span>
          <select
            value={form.duration}
            onChange={(event) =>
              update("duration", Number(event.target.value))
            }
          >
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </label>

        <label className="matchmaker-club">
          <span>Klub</span>
          <select
            value={form.clubSlug}
            onChange={(event) =>
              update("clubSlug", event.target.value)
            }
          >
            <option value="">Wszystkie kluby</option>

            {clubs.map((club) => (
              <option key={club.slug} value={club.slug}>
                {club.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="matchmaker-search"
          disabled={loading}
          onClick={search}
        >
          {loading
            ? "Szukam kortu i graczy..."
            : "Znajdź gotowy mecz"}
        </button>
      </div>

      {message && (
        <div className="matchmaker-message">
          {message}
        </div>
      )}

      {searched && (
        <>
          <section className="ready-matches-section">
            <div className="matchmaker-result-head">
              <div>
                <span className="section-kicker">
                  GOTOWE PROPOZYCJE
                </span>

                <strong>
                  {readyMatches.length > 0
                    ? `${readyMatches.length} terminów z wolnym kortem`
                    : "Brak kompletnej propozycji"}
                </strong>

                <small>
                  Zielone propozycje mają kort i 3 pasujących
                  graczy. Pozostałe pokazują, ilu osób jeszcze brakuje.
                </small>
              </div>
            </div>

            <div className="ready-match-grid">
              {readyMatches.map((ready) => (
                <article
                  key={`${ready.clubSlug}-${ready.courtId}-${ready.from}`}
                  className={
                    ready.playersFound >= 3
                      ? "ready-match-card complete"
                      : "ready-match-card partial"
                  }
                >
                  <header>
                    <div>
                      <span className="ready-status">
                        {ready.playersFound >= 3
                          ? "✓ GOTOWY MECZ"
                          : `Brakuje ${ready.playersNeeded}`}
                      </span>

                      <h3>
                        {ready.from}–{ready.to}
                      </h3>
                    </div>

                    <div className="ready-score">
                      <strong>{ready.readyScore}%</strong>
                      <small>dopasowania</small>
                    </div>
                  </header>

                  <div className="ready-court">
                    <span></span>
                    <div>
                      <strong>{ready.courtName}</strong>
                      <small>{ready.clubName}</small>
                    </div>
                  </div>

                  <div className="ready-player-row">
                    <span className="ready-player organizer">
                      TY
                    </span>

                    {ready.players.map((player) => (
                      <span
                        className="ready-player"
                        key={player.ownerToken}
                        title={`${player.nickname} · ${player.level}`}
                      >
                        {player.nickname
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    ))}

                    {Array.from({
                      length: Math.max(
                        0,
                        3 - ready.players.length
                      )
                    }).map((_, index) => (
                      <span
                        className="ready-player empty"
                        key={`empty-${index}`}
                      >
                        ＋
                      </span>
                    ))}
                  </div>

                  <div className="ready-player-names">
                    {ready.players.length > 0
                      ? ready.players
                          .map(
                            (player) =>
                              `${player.nickname} ${player.level}`
                          )
                          .join(" · ")
                      : "Nie znaleziono jeszcze pasujących graczy."}
                  </div>

                  <button
                    type="button"
                    className="ready-create-button"
                    onClick={() => createFromReady(ready)}
                  >
                    {ready.playersFound >= 3
                      ? "Utwórz i zaproś ekipę"
                      : "Utwórz mecz mimo to"}
                  </button>

                  {ready.reservationUrl && (
                    <a
                      className="ready-bo5-link"
                      href={ready.reservationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Otwórz rezerwację BO5 ↗
                    </a>
                  )}
                </article>
              ))}

              {readyMatches.length === 0 && (
                <div className="empty-state large">
                  Nie udało się znaleźć ciągłego wolnego
                  terminu w tym zakresie. Poszerz godziny,
                  zmień czas gry albo wybierz wszystkie kluby.
                </div>
              )}
            </div>
          </section>

          <section className="matchmaker-players-only">
            <div className="matchmaker-result-head">
              <div>
                <span className="section-kicker">
                  PASUJĄCY GRACZE
                </span>
                <strong>
                  {players.length} znalezionych osób
                </strong>
                <small>
                  Ta lista przyda się również, gdy chcesz
                  samodzielnie wybrać termin.
                </small>
              </div>
            </div>

            <div className="matchmaker-player-list">
              {bestPlayers.map((player, index) => (
                <article
                  key={`${player.postId}-${player.ownerToken}`}
                >
                  <div className="matchmaker-rank">
                    {index + 1}
                  </div>

                  <div className="matchmaker-player-main">
                    <div className="matchmaker-player-title">
                      <strong>{player.nickname}</strong>
                    </div>

                    <div className="matchmaker-player-meta">
                      <LevelBadge
                        level={player.level}
                        compact
                      />
                      <span>
                        🕒 {player.from}–{player.to}
                      </span>
                      <span>
                        ↔ {player.preferredSide}
                      </span>
                    </div>

                    <small>{player.clubName}</small>
                  </div>

                  <div className="matchmaker-score">
                    <strong>
                      {Math.max(
                        0,
                        Math.min(100, player.score)
                      )}%
                    </strong>
                    <small>dopasowania</small>
                  </div>
                </article>
              ))}

              {players.length === 0 && (
                <div className="empty-state large">
                  Brak zgłoszeń innych graczy
                  pasujących do tego terminu.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default MatchmakerPanel;
