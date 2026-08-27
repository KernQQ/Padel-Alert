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
  countdown,
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
      .filter((item) => {
        const itemKey = item?.clubSlug || normalizeKey(item?.clubName);
        return itemKey === key;
      })
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

  const nearest = recommendations
    .filter(
      (item, index, arr) =>
        arr.findIndex(
          (candidate) =>
            candidate.startHour === item.startHour &&
            candidate.clubName === item.clubName
        ) === index
    )
    .slice(0, 3);

  return (
    <div className="pa-premium-home pa-rc-home">
      <section className="pa-premium-hero pa-rc-hero">
        <div className="pa-premium-hero-copy">
          <p className="pa-premium-kicker">SZCZECIN · LIVE</p>
          <h1>
            Graj,
            <strong>kiedy chcesz.</strong>
          </h1>
          <p>Wolne korty w Szczecinie w jednym miejscu.</p>
        </div>
      </section>

      <section className="pa-premium-search pa-rc-search">
        <button type="button" className="pa-premium-field" onClick={onOpenCourts}>
          <small>Lokalizacja</small>
          <strong>Szczecin</strong>
          <span>⌄</span>
        </button>

        <button type="button" className="pa-premium-field" onClick={onOpenCourts}>
          <small>Data</small>
          <strong>{date || "Dzisiaj"}</strong>
          <span>⌄</span>
        </button>

        <button
          type="button"
          className="pa-premium-field pa-premium-field-time"
          onClick={onOpenCourts}
        >
          <small>Godzina od</small>
          <strong>{from || "18:00"}</strong>
          <span>⌄</span>
        </button>

        <button
          type="button"
          className="pa-premium-field pa-premium-field-time"
          onClick={onOpenCourts}
        >
          <small>Czas gry</small>
          <strong>{duration} min</strong>
          <span>⌄</span>
        </button>

        <button
          type="button"
          className="pa-premium-field pa-premium-field-more"
          onClick={onOpenCourts}
        >
          <small>Więcej</small>
          <strong>Filtry gry</strong>
          <span>⌄</span>
        </button>

        <button
          type="button"
          className="pa-premium-search-button"
          onClick={onOpenCourts}
        >
          Szukaj kortów <span>→</span>
        </button>
      </section>

      <div className="pa-premium-mobile-more">
        <button type="button" onClick={onOpenCourts}>
          + Więcej filtrów
        </button>
      </div>

      <section className="pa-premium-tabs pa-rc-tabs">
        <button type="button" className="active" onClick={onOpenCourts}>
          Dzisiaj
          <small>teraz</small>
        </button>
        <button type="button" onClick={onOpenCourts}>
          Jutro
        </button>
        <button type="button" onClick={onOpenCourts}>
          Weekend
        </button>
        <span>↻ odświeżenie za {countdown}s</span>
      </section>

      <header className="pa-premium-section-title pa-rc-section-title">
        <div>
          <h2>Najbliższe wolne</h2>
          <p>Najszybsze dostępne godziny w Szczecinie</p>
        </div>
        <button type="button" onClick={onOpenCourts}>
          Zobacz wszystkie →
        </button>
      </header>

      <section className="pa-rc-nearest">
        {nearest.length > 0 ? (
          nearest.map((item) => (
            <button
              type="button"
              className="pa-rc-nearest-card"
              key={`${item.clubName}-${item.courtKey}-${item.startHour}`}
              onClick={() => onSelectCourt(item)}
            >
              <span className="pa-rc-nearest-mark">
                {(item.clubName || "P").slice(0, 1).toUpperCase()}
              </span>
              <span className="pa-rc-nearest-copy">
                <small>{item.clubName}</small>
                <strong>{item.startHour}</strong>
                <em>
                  {item.courtName} · {duration} min
                </em>
              </span>
              <b>→</b>
            </button>
          ))
        ) : (
          <button
            type="button"
            className="pa-rc-nearest-card pa-rc-nearest-empty"
            onClick={onOpenCourts}
          >
            <span className="pa-rc-nearest-mark">↻</span>
            <span className="pa-rc-nearest-copy">
              <small>Brak szybkiego wyniku</small>
              <strong>Sprawdź dostępność</strong>
              <em>Otwórz pełną wyszukiwarkę kortów</em>
            </span>
            <b>→</b>
          </button>
        )}

        <button
          type="button"
          className="pa-rc-nearest-card pa-rc-nearest-all"
          onClick={onOpenCourts}
        >
          <span className="pa-rc-nearest-mark">⌗</span>
          <span className="pa-rc-nearest-copy">
            <small>Wszystkie kluby</small>
            <strong>Więcej terminów</strong>
            <em>Pełna wyszukiwarka</em>
          </span>
          <b>→</b>
        </button>
      </section>

      <header className="pa-premium-section-title pa-rc-section-title pa-rc-clubs-title">
        <div>
          <h2>Kluby w Szczecinie</h2>
          <p>Najbliższe terminy bez przechodzenia między stronami</p>
        </div>
        <button type="button" onClick={onOpenCourts}>
          Zobacz wszystkie kluby →
        </button>
      </header>

      <section className="pa-premium-club-grid pa-rc-club-grid">
        {topClubs.map((club, index) => {
          const clubSlots = slotsForClub(club);

          return (
            <article
              className="pa-premium-club-card pa-rc-club-card"
              key={club.slug || club.name}
            >
              <button
                type="button"
                className="pa-premium-club-photo pa-rc-club-photo"
                style={{ backgroundImage: `url(${imageForClub(club, index)})` }}
                onClick={onOpenCourts}
                aria-label={`Otwórz ${club.name}`}
              >
                <span className="pa-premium-favorite">♡</span>
              </button>

              <div className="pa-premium-club-body pa-rc-club-body">
                <div className="pa-premium-club-heading">
                  <h3>{club.name}</h3>
                  <b>
                    {clubSlots.length > 0
                      ? `${clubSlots.length} ${clubSlots.length === 1 ? "termin" : "terminy"}`
                      : "Sprawdź"}
                  </b>
                </div>

                <p>{Object.keys(club.courts || {}).length} kortów · Szczecin</p>

                <div className="pa-rc-card-label">Najbliższe wolne</div>

                {clubSlots.length > 0 ? (
                  <div className="pa-premium-times pa-rc-times">
                    {clubSlots.map((item) => (
                      <button
                        type="button"
                        key={`${item.courtKey}-${item.startHour}`}
                        onClick={() => onSelectCourt(item)}
                      >
                        {item.startHour}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pa-premium-check"
                    onClick={onOpenCourts}
                  >
                    Sprawdź dostępność →
                  </button>
                )}

                <button
                  type="button"
                  className="pa-rc-card-action"
                  onClick={onOpenCourts}
                >
                  Zobacz wszystkie terminy <span>→</span>
                </button>
              </div>
            </article>
          );
        })}

        {topClubs.length === 0 && (
          <div className="pa-premium-empty pa-rc-empty">
            <strong>Ładowanie klubów…</strong>
            <span>Dane dostępności są pobierane z BO5.</span>
          </div>
        )}
      </section>

      <section className="pa-premium-feature-strip pa-rc-feature-strip">
        <button type="button" onClick={onOpenSaved}>
          <b>◉</b>
          <span>
            <strong>Alerty</strong>
            <small>Powiadomienia o wolnych kortach</small>
          </span>
        </button>
        <button type="button" onClick={onOpenSaved}>
          <b>♡</b>
          <span>
            <strong>Ulubione</strong>
            <small>Zapisuj kluby i korty</small>
          </span>
        </button>
        <button type="button" onClick={onOpenPlayers}>
          <b>♧</b>
          <span>
            <strong>Znajomi</strong>
            <small>Znajdź partnera do gry</small>
          </span>
        </button>
        <button type="button" onClick={onOpenMatches}>
          <b>ϟ</b>
          <span>
            <strong>Szybka gra</strong>
            <small>Znajdź mecz w kilka sekund</small>
          </span>
        </button>
      </section>

      {activePlayers.length > 0 && (
        <section className="pa-premium-players pa-rc-players">
          <header>
            <div>
              <h2>Gracze szukający gry</h2>
              <p>Osoby o podobnym poziomie</p>
            </div>
            <button type="button" onClick={onOpenPlayers}>
              Wszyscy →
            </button>
          </header>

          <div>
            {activePlayers.map((player) => (
              <article key={player.id}>
                <span className="consumer-player-avatar">
                  {player.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{player.nickname}</strong>
                  <small>
                    {player.clubName} · {player.from}–{player.to}
                  </small>
                </div>
                <LevelBadge level={player.level} compact />
                <button type="button" onClick={() => onInvitePlayer(player)}>
                  Zaproś
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomeDashboard;
