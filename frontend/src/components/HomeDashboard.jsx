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
  const nextSlots = recommendations.slice(0, 5);
  const activePlayers = players.slice(0, 3);

  return (
    <div className="consumer-home v8-home">
      <section className="v8-home-hero">
        <div className="v8-home-hero-copy">
          <p className="consumer-location">Szczecin</p>
          <h1>Znajdź. Zarezerwuj.<br/><strong>Graj.</strong></h1>
          <p className="consumer-subtitle">Wolne korty, mecze i gracze w jednym miejscu.</p>
          <div className="v8-hero-actions">
            <button type="button" className="v8-primary-cta" onClick={onOpenCourts}>Znajdź wolny kort <span>→</span></button>
            <button type="button" className="v8-secondary-cta" onClick={onOpenMatches}>Znajdź mecz <span>→</span></button>
          </div>
        </div>
        <div className="v8-home-photo" aria-hidden="true">
          <div className="v8-net" />
          <span className="v8-ball">PA</span>
        </div>
      </section>

      <section className="consumer-section v8-section">
        <header className="consumer-section-header">
          <div><h2>Najbliższe wolne terminy</h2><p>Aktualna dostępność w klubach</p></div>
          <button type="button" onClick={onOpenCourts}>Zobacz wszystkie</button>
        </header>
        {nextSlots.length > 0 ? (
          <div className="v8-availability-list">
            {nextSlots.map((item) => (
              <button className="v8-availability-row" type="button" key={`${item.courtKey}-${item.startHour}`} onClick={() => onSelectCourt(item)}>
                <time>{item.startHour}</time>
                <span className="v8-thumb">{item.clubName.slice(0,1)}</span>
                <span className="v8-availability-main"><strong>{item.clubName}</strong><small>{item.courtName}</small></span>
                <span>{duration} min</span>
                <b>Wybierz →</b>
              </button>
            ))}
          </div>
        ) : (
          <div className="consumer-empty v8-empty"><strong>Brak wyników dla ostatniego wyszukiwania.</strong><span>Sprawdź inny przedział czasu albo następny dzień.</span><button type="button" onClick={onOpenCourts}>Znajdź kort</button></div>
        )}
      </section>

      <div className="v8-home-grid">
        <section className="consumer-section v8-section">
          <header className="consumer-section-header"><div><h2>Kluby</h2><p>Szczecin</p></div></header>
          <div className="v8-clubs-list">
            {clubStats.slice(0,3).map((club) => (
              <button key={club.slug} type="button" onClick={onOpenCourts}>
                <span className="v8-club-photo">{club.name.slice(0,1)}</span>
                <span><strong>{club.name}</strong><small>{Object.keys(club.courts || {}).length} kortów{club.available > 0 ? ` · ${club.available} wolnych` : ""}</small></span>
                <b>→</b>
              </button>
            ))}
          </div>
        </section>

        <section className="consumer-section v8-section">
          <header className="consumer-section-header"><div><h2>Kto szuka gry?</h2><p>Gracze o podobnym poziomie</p></div><button type="button" onClick={onOpenPlayers}>Wszyscy</button></header>
          {activePlayers.length > 0 ? (
            <div className="v8-players-list">
              {activePlayers.map((player) => (
                <article key={player.id}><span className="consumer-player-avatar">{player.nickname.slice(0,1).toUpperCase()}</span><div><strong>{player.nickname}</strong><small>{player.clubName} · {player.from}–{player.to}</small></div><LevelBadge level={player.level} compact /><button type="button" onClick={() => onInvitePlayer(player)}>Zaproś</button></article>
              ))}
            </div>
          ) : (
            <div className="consumer-empty consumer-empty-small"><strong>Na razie brak aktywnych zgłoszeń.</strong><button type="button" onClick={onOpenPlayers}>Dodaj zgłoszenie</button></div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomeDashboard;
