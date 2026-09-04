import LevelBadge from "./ui/LevelBadge";

const CLUB_IMAGES = {
  "padel-arena-poludniowa": "/premium/club-1.jpg",
  "padel-club": "/premium/club-2.jpg",
  "fabryka-energii": "/premium/club-3.jpg"
};

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function imageForClub(club, index) {
  const key = club?.slug || normalizeKey(club?.name);
  return CLUB_IMAGES[key] || `/premium/club-${(index % 3) + 1}.jpg`;
}

function HomeDashboard({
  nickname,
  level,
  recommendations,
  clubStats,
  players,
  duration,
  date,
  from,
  onOpenCourts,
  onOpenMatches,
  onOpenPlayers,
  onOpenSaved,
  onSelectCourt,
  onInvitePlayer
}) {
  const topClubs = clubStats.slice(0, 3);
  const activePlayers = players.slice(0, 3);

  const slotsForClub = (club) => {
    const key = club?.slug || normalizeKey(club?.name);
    return recommendations
      .filter((item) => (item?.clubSlug || normalizeKey(item?.clubName)) === key)
      .filter(
        (item, index, arr) =>
          arr.findIndex(
            (candidate) =>
              candidate.startHour === item.startHour &&
              candidate.clubName === item.clubName
          ) === index
      )
      .slice(0, 4);
  };

  return (
    <div className="pd-home-v1">
      <section className="pd-home-hero">
        <div className="pd-home-hero-copy">
          <div className="pd-home-eyebrow">SZCZECIN · PADEL · COMMUNITY</div>
          <h1>
            <span>KORTY</span>
            <span>LUDZIE</span>
            <span>GRA<i>.</i></span>
          </h1>
          <p>Wolne terminy. Rezerwuj. Widzimy się na korcie.</p>
        </div>
        <div className="pd-home-hero-photo" aria-hidden="true" />
      </section>

      <section className="pd-home-search" aria-label="Szybkie wyszukiwanie kortów">
        <button type="button" onClick={onOpenCourts}>
          <small>Lokalizacja</small>
          <strong>Szczecin</strong>
          <span>⌄</span>
        </button>
        <button type="button" onClick={onOpenCourts}>
          <small>Data</small>
          <strong>{date || "Dzisiaj"}</strong>
          <span>⌄</span>
        </button>
        <button type="button" onClick={onOpenCourts}>
          <small>Godzina od</small>
          <strong>{from || "08:00"}</strong>
          <span>⌄</span>
        </button>
        <button type="button" onClick={onOpenCourts}>
          <small>Czas gry</small>
          <strong>{duration} min</strong>
          <span>⌄</span>
        </button>
        <button type="button" className="pd-home-search-submit" onClick={onOpenCourts}>
          Szukaj kortów <span>→</span>
        </button>
      </section>

      <section className="pd-home-section">
        <header className="pd-home-section-head">
          <div>
            <small>OSTATNIO SPRAWDZANE</small>
            <h2>Najbliższe wolne</h2>
            <p>Najbliższe terminy w Szczecinie.</p>
          </div>
          <button type="button" onClick={onOpenCourts}>Zobacz wszystkie kluby →</button>
        </header>

        <div className="pd-home-clubs">
          {topClubs.map((club, index) => {
            const slots = slotsForClub(club);
            return (
              <article className="pd-home-club-card" key={club.slug || club.name}>
                <button
                  type="button"
                  className="pd-home-club-photo"
                  style={{ backgroundImage: `url(${imageForClub(club, index)})` }}
                  onClick={onOpenCourts}
                  aria-label={`Otwórz ${club.name}`}
                >
                  <span>♡</span>
                </button>
                <div className="pd-home-club-info">
                  <div className="pd-home-club-top">
                    <div>
                      <h3>{club.name}</h3>
                      <p>{Object.keys(club.courts || {}).length} kortów · Szczecin</p>
                    </div>
                    <button type="button" onClick={onOpenCourts} aria-label="Więcej terminów">→</button>
                  </div>

                  {slots.length > 0 ? (
                    <div className="pd-home-slots">
                      {slots.map((item, slotIndex) => (
                        <button
                          type="button"
                          className={slotIndex === 0 ? "is-first" : ""}
                          key={`${item.courtKey}-${item.startHour}`}
                          onClick={() => onSelectCourt(item)}
                        >
                          {item.startHour}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button type="button" className="pd-home-no-slot" onClick={onOpenCourts}>
                      Sprawdź dostępność →
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {topClubs.length === 0 && (
            <button type="button" className="pd-home-empty" onClick={onOpenCourts}>
              <strong>Sprawdź dostępność kortów</strong>
              <span>Dane są właśnie pobierane.</span>
            </button>
          )}
        </div>
      </section>

      <section className="pd-home-benefits">
        <button type="button" onClick={onOpenCourts}>
          <b>⌁</b>
          <span><strong>Szybkie wyszukiwanie</strong><small>Znajdź wolne korty w kilka sekund.</small></span>
        </button>
        <button type="button" onClick={onOpenMatches}>
          <b>◎</b>
          <span><strong>Więcej meczów</strong><small>Dołącz do gry i poznaj nowych ludzi.</small></span>
        </button>
        <button type="button" onClick={onOpenPlayers}>
          <b>□</b>
          <span><strong>Aktywna społeczność</strong><small>Gracze, kluby, wydarzenia.</small></span>
        </button>
        <button type="button" onClick={onOpenSaved}>
          <b>▥</b>
          <span><strong>Wszystko w jednym miejscu</strong><small>Korty, mecze, gracze.</small></span>
        </button>
      </section>

      <section className="pd-home-community">
        <div className="pd-home-community-copy">
          <small>PADEL ŁĄCZY</small>
          <h2>Ten sam kort.<br />Więcej dobrych ludzi.</h2>
          <button type="button" onClick={onOpenPlayers}>Dołącz do gry <span>→</span></button>
        </div>
        <div className="pd-home-community-photo" aria-hidden="true" />
        <div className="pd-home-community-words">
          <span>GRAJ</span><span>POZNAWAJ</span><span>RYWALIZUJ</span><span>WRACAJ</span>
        </div>
      </section>

      {activePlayers.length > 0 && (
        <section className="pd-home-players">
          <header>
            <div>
              <small>SPOŁECZNOŚĆ</small>
              <h2>Kto teraz szuka gry</h2>
            </div>
            <button type="button" onClick={onOpenPlayers}>Wszyscy →</button>
          </header>
          <div>
            {activePlayers.map((player) => (
              <article key={player.id}>
                <span className="consumer-player-avatar">{player.nickname.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{player.nickname}</strong>
                  <small>{player.clubName} · {player.from}–{player.to}</small>
                </div>
                <LevelBadge level={player.level} compact />
                <button type="button" onClick={() => onInvitePlayer(player)}>Zaproś</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomeDashboard;
