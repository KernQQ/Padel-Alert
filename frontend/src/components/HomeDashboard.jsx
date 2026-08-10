import LevelBadge from "./ui/LevelBadge";

function HomeDashboard({
  nickname,
  level,
  countdown,
  recommendations,
  clubStats,
  players,
  duration,
  onOpenCourts,
  onOpenMatches,
  onOpenPlayers,
  onOpenSaved,
  onSelectCourt,
  onInvitePlayer
}) {
  const firstName = nickname || "Gość";
  const nextSlots = recommendations.slice(0, 4);
  const activePlayers = players.slice(0, 3);

  return (
    <div className="consumer-home">
      <header className="consumer-home-header">
        <div>
          <p className="consumer-location">Szczecin</p>
          <h1>Graj w padla.</h1>
          <p className="consumer-subtitle">
            Kort, mecz albo partner — bez przeklikiwania kilku stron.
          </p>
        </div>

        <button className="consumer-profile-button" type="button" onClick={onOpenSaved}>
          <span>{firstName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{firstName}</strong>
            <small>Poziom {level || "3.0"}</small>
          </div>
        </button>
      </header>

      <section className="consumer-primary-actions">
        <button className="consumer-action consumer-action-primary" type="button" onClick={onOpenCourts}>
          <span className="consumer-action-label">Rezerwacja</span>
          <strong>Znajdź wolny kort</strong>
          <small>Porównaj terminy w klubach</small>
          <b>→</b>
        </button>

        <button className="consumer-action" type="button" onClick={onOpenMatches}>
          <span className="consumer-action-label">Społeczność</span>
          <strong>Znajdź mecz</strong>
          <small>Dołącz albo utwórz własny</small>
          <b>→</b>
        </button>
      </section>

      <section className="consumer-section">
        <header className="consumer-section-header">
          <div>
            <h2>Najbliższe wolne terminy</h2>
            <p>Na podstawie ostatniego wyszukiwania</p>
          </div>
          <button type="button" onClick={onOpenCourts}>Zobacz wszystkie</button>
        </header>

        {nextSlots.length > 0 ? (
          <div className="consumer-slot-list">
            {nextSlots.map((item) => (
              <button
                className="consumer-slot-row"
                type="button"
                key={`${item.courtKey}-${item.startHour}`}
                onClick={() => onSelectCourt(item)}
              >
                <time>{item.startHour}</time>
                <span className="consumer-slot-main">
                  <strong>{item.clubName}</strong>
                  <small>{item.courtName} · {duration} min</small>
                </span>
                <span className="consumer-slot-availability">Wolny</span>
                <b>→</b>
              </button>
            ))}
          </div>
        ) : (
          <div className="consumer-empty">
            <strong>Nie ma wyników dla ostatniego wyszukiwania.</strong>
            <span>Wybierz inną godzinę albo sprawdź kolejny dzień.</span>
            <button type="button" onClick={onOpenCourts}>Znajdź kort</button>
          </div>
        )}
      </section>

      <section className="consumer-section">
        <header className="consumer-section-header">
          <div>
            <h2>Kluby w Szczecinie</h2>
            <p>Dostępność pobierana z BO5</p>
          </div>
        </header>

        <div className="consumer-club-strip">
          {clubStats.slice(0, 3).map((club) => (
            <button type="button" key={club.slug} onClick={onOpenCourts}>
              <span className="consumer-club-mark">
                {club.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{club.name}</strong>
                <small>
                  {Object.keys(club.courts || {}).length} kortów
                  {club.available > 0 ? ` · ${club.available} wolnych` : ""}
                </small>
              </span>
              <b>→</b>
            </button>
          ))}
        </div>
      </section>

      <section className="consumer-section">
        <header className="consumer-section-header">
          <div>
            <h2>Gracze szukający gry</h2>
            <p>Znajdź osoby o podobnym poziomie</p>
          </div>
          <button type="button" onClick={onOpenPlayers}>Wszyscy gracze</button>
        </header>

        {activePlayers.length > 0 ? (
          <div className="consumer-player-list">
            {activePlayers.map((player) => (
              <article key={player.id}>
                <span className="consumer-player-avatar">
                  {player.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{player.nickname}</strong>
                  <small>{player.clubName} · {player.from}–{player.to}</small>
                </div>
                <LevelBadge level={player.level} compact />
                <button type="button" onClick={() => onInvitePlayer(player)}>Zaproś</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="consumer-empty consumer-empty-small">
            <strong>Na razie brak aktywnych zgłoszeń.</strong>
            <button type="button" onClick={onOpenPlayers}>Dodaj zgłoszenie</button>
          </div>
        )}
      </section>

      <footer className="consumer-status">
        <span><i /> Dane odświeżane automatycznie</span>
        <small>następne odświeżenie za {countdown}s</small>
      </footer>
    </div>
  );
}

export default HomeDashboard;
