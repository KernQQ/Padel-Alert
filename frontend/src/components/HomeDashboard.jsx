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
  const hasRecommendations = recommendations.length > 0;
  const activePlayers = players.slice(0, 4);

  return (
    <div className="v4-home">
      <header className="v4-home-header">
        <div>
          <span className="v4-overline">PADELALERT</span>
          <h1>Cześć, {firstName}.</h1>
          <p>Znajdź kort, mecz albo partnera do gry.</p>
        </div>
        <div className="v4-refresh">
          <span className="live-dot" />
          Odświeżenie za {countdown}s
        </div>
      </header>

      <section className="v4-actions" aria-label="Szybkie akcje">
        <button type="button" onClick={onOpenCourts}>
          <span className="v4-action-index">01</span>
          <strong>Znajdź kort</strong>
          <small>Sprawdź wolne terminy</small>
          <b>→</b>
        </button>
        <button type="button" onClick={onOpenMatches}>
          <span className="v4-action-index">02</span>
          <strong>Mecze</strong>
          <small>Utwórz lub dołącz</small>
          <b>→</b>
        </button>
        <button type="button" onClick={onOpenPlayers}>
          <span className="v4-action-index">03</span>
          <strong>Gracze</strong>
          <small>Znajdź partnera</small>
          <b>→</b>
        </button>
      </section>

      <section className="v4-section">
        <div className="v4-section-head">
          <div>
            <span className="v4-overline">WOLNE KORTY</span>
            <h2>Najbliższe terminy</h2>
          </div>
          <button type="button" onClick={onOpenCourts}>Wszystkie terminy</button>
        </div>

        {hasRecommendations ? (
          <div className="v4-slot-list">
            {recommendations.slice(0, 5).map((item) => (
              <article className="v4-slot" key={`${item.courtKey}-${item.startHour}`}>
                <div className="v4-slot-time">
                  <strong>{item.startHour}</strong>
                  <small>{duration} min</small>
                </div>
                <div className="v4-slot-club">
                  <strong>{item.clubName}</strong>
                  <small>{item.courtName}</small>
                </div>
                <div className="v4-slot-type">
                  {item.courtType === "outdoor" ? "zewnętrzny" : "wewnętrzny"}
                </div>
                <button type="button" onClick={() => onSelectCourt(item)}>Wybierz →</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="v4-empty">
            Brak wyników dla ostatniego wyszukiwania.
            <button type="button" onClick={onOpenCourts}>Ustaw wyszukiwanie</button>
          </div>
        )}
      </section>

      <div className="v4-two-col">
        <section className="v4-section">
          <div className="v4-section-head">
            <div>
              <span className="v4-overline">KLUBY</span>
              <h2>Dostępność</h2>
            </div>
          </div>
          <div className="v4-club-list">
            {clubStats.slice(0, 4).map((club) => (
              <button type="button" key={club.slug} onClick={onOpenCourts}>
                <span>
                  <strong>{club.name}</strong>
                  <small>{Object.keys(club.courts || {}).length} kortów</small>
                </span>
                <b>{club.available}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="v4-section">
          <div className="v4-section-head">
            <div>
              <span className="v4-overline">GRACZE</span>
              <h2>Szukają gry</h2>
            </div>
            <button type="button" onClick={onOpenPlayers}>Wszyscy</button>
          </div>
          <div className="v4-player-list">
            {activePlayers.length > 0 ? activePlayers.map((player) => (
              <article key={player.id}>
                <span className="v4-avatar">{player.nickname.slice(0,1).toUpperCase()}</span>
                <div>
                  <strong>{player.nickname}</strong>
                  <small>{player.clubName} · {player.from}–{player.to}</small>
                </div>
                <LevelBadge level={player.level} compact />
                <button type="button" onClick={() => onInvitePlayer(player)}>Zaproś</button>
              </article>
            )) : (
              <div className="v4-empty compact">Na razie nikt nie dodał zgłoszenia.</div>
            )}
          </div>
        </section>
      </div>

      <footer className="v4-profile-strip">
        <div>
          <span className="v4-avatar">{firstName.slice(0,1).toUpperCase()}</span>
          <span>
            <strong>{firstName}</strong>
            <small>{level || "Uzupełnij profil gracza"}</small>
          </span>
        </div>
        <button type="button" onClick={onOpenSaved}>Profil i ustawienia →</button>
      </footer>
    </div>
  );
}

export default HomeDashboard;
