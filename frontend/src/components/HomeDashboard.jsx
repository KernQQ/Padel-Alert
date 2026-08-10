import LevelBadge from "./ui/LevelBadge";

function uniqueHours(recommendations, clubName) {
  return recommendations
    .filter((item) => item.clubName === clubName)
    .map((item) => item.startHour)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 5);
}

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
  const clubs = clubStats.slice(0, 3);
  const mobileClubs = clubs.map((club) => ({
    ...club,
    hours: uniqueHours(recommendations, club.name)
  }));

  const desktopHours = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
  const activePlayers = players.slice(0, 3);

  return (
    <div className="pa10-home">
      {/* DESKTOP — approved A-style desktop */}
      <div className="pa10-desktop">
        <section className="pa10-hero">
          <div className="pa10-hero-copy">
            <span className="pa10-kicker">Szczecin</span>
            <h1>
              <span>Znajdź. Zarezerwuj.</span>
              <strong>Graj.</strong>
            </h1>
            <p>Sprawdzamy dostępność kortów za Ciebie. Ty grasz.</p>
          </div>

          <div className="pa10-hero-photo" />

          <button className="pa10-hero-heart" type="button" onClick={onOpenSaved} aria-label="Ulubione">
            ♡
          </button>
        </section>

        <section className="pa10-searchbar" onClick={onOpenCourts}>
          <div>
            <small>Lokalizacja</small>
            <strong>Szczecin</strong>
          </div>
          <div>
            <small>Data</small>
            <strong>Dzisiaj</strong>
          </div>
          <div>
            <small>Godzina od</small>
            <strong>17:00</strong>
          </div>
          <div>
            <small>Czas gry</small>
            <strong>{duration} min</strong>
          </div>
          <div>
            <small>Gracze</small>
            <strong>2–4</strong>
          </div>
          <button type="button">Szukaj kortów <b>→</b></button>
        </section>

        <div className="pa10-datebar">
          <button className="active" type="button">Dzisiaj <small>teraz</small></button>
          <button type="button" onClick={onOpenCourts}>Jutro</button>
          <button type="button" onClick={onOpenCourts}>Piątek</button>
          <button type="button" onClick={onOpenCourts}>Weekend</button>
          <span>odświeżenie za {countdown}s</span>
        </div>

        <div className="pa10-workspace">
          <section className="pa10-board">
            <header>
              <div>
                <h2>Dostępność kortów</h2>
                <p>Najbliższe wolne terminy w Szczecinie</p>
              </div>
              <button type="button" onClick={onOpenCourts}>Pełna wyszukiwarka →</button>
            </header>

            <div className="pa10-board-head">
              <span>Klub</span>
              {desktopHours.map((hour) => <b key={hour}>{hour}</b>)}
            </div>

            {clubs.map((club, clubIndex) => {
              const hours = uniqueHours(recommendations, club.name);
              return (
                <div className="pa10-board-row" key={club.slug}>
                  <button className="pa10-club-cell" type="button" onClick={onOpenCourts}>
                    <span className="pa10-club-image" style={{ backgroundPosition: `${35 + clubIndex * 20}% center` }} />
                    <span>
                      <strong>{club.name}</strong>
                      <small>{Object.keys(club.courts || {}).length} kortów</small>
                    </span>
                  </button>

                  {desktopHours.map((hour) => {
                    const isAvailable = hours.includes(hour);
                    const item = recommendations.find(
                      (slot) => slot.clubName === club.name && slot.startHour === hour
                    );

                    return (
                      <button
                        key={`${club.slug}-${hour}`}
                        type="button"
                        className={isAvailable ? "pa10-slot available" : "pa10-slot"}
                        onClick={() => item ? onSelectCourt(item) : onOpenCourts()}
                      >
                        {isAvailable ? (
                          <>
                            <strong>{duration} min</strong>
                            <small>wolny</small>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            <button className="pa10-more" type="button" onClick={onOpenCourts}>
              Pokaż więcej klubów ↓
            </button>
          </section>

          <aside className="pa10-rail">
            <section className="pa10-map-card">
              <header>
                <h3>Kluby w Szczecinie</h3>
                <button type="button" onClick={onOpenCourts}>Wszystkie →</button>
              </header>
              <div className="pa10-map">
                <i className="pin p1">1</i>
                <i className="pin p2">2</i>
                <i className="pin p3">3</i>
              </div>
              {clubs.map((club, index) => (
                <button type="button" key={club.slug} onClick={onOpenCourts}>
                  <b>{index + 1}</b>
                  <span><strong>{club.name}</strong><small>{Object.keys(club.courts || {}).length} kortów</small></span>
                  <i>→</i>
                </button>
              ))}
            </section>

            <section className="pa10-next-card">
              <header>
                <h3>Najbliższe wolne</h3>
                <button type="button" onClick={onOpenCourts}>Wszystkie →</button>
              </header>
              {recommendations.slice(0, 3).map((item) => (
                <button type="button" key={`${item.courtKey}-${item.startHour}`} onClick={() => onSelectCourt(item)}>
                  <time>{item.startHour}</time>
                  <span><strong>{item.clubName}</strong><small>{item.courtName} · {duration} min</small></span>
                  <b>→</b>
                </button>
              ))}
              {recommendations.length === 0 && <p>Brak wolnych terminów w tej chwili.</p>}
            </section>
          </aside>
        </div>

        <section className="pa10-feature-strip">
          <button type="button" onClick={onOpenSaved}><b>◉</b><span><strong>Alerty</strong><small>Daj znać, gdy zwolni się kort</small></span></button>
          <button type="button" onClick={onOpenCourts}><b>⌕</b><span><strong>Bez szukania</strong><small>Wszystkie kluby w jednym miejscu</small></span></button>
          <button type="button" onClick={onOpenMatches}><b>◎</b><span><strong>Mecze</strong><small>Znajdź ekipę i zagraj</small></span></button>
          <button type="button" onClick={onOpenPlayers}><b>＋</b><span><strong>Gracze</strong><small>Znajdź partnera na swoim poziomie</small></span></button>
        </section>
      </div>

      {/* MOBILE — approved B minimal booking app */}
      <div className="pa10-mobile">
        <header className="pa10-mobile-intro">
          <span>Szczecin</span>
          <h1>Gdzie grasz?</h1>
          <p>Znajdź wolny kort w kilka sekund.</p>
        </header>

        <div className="pa10-mobile-days">
          <button className="active" type="button">Dzisiaj</button>
          <button type="button" onClick={onOpenCourts}>Jutro</button>
          <button type="button" onClick={onOpenCourts}>Weekend</button>
          <button type="button" onClick={onOpenCourts}>⌄</button>
        </div>

        <div className="pa10-mobile-filter">
          <button type="button" onClick={onOpenCourts}>Wszystkie kluby <span>⌄</span></button>
        </div>

        <section className="pa10-mobile-clubs">
          {mobileClubs.map((club, index) => (
            <article key={club.slug}>
              <header>
                <span className="pa10-mobile-club-photo" style={{ backgroundPosition: `${35 + index * 20}% center` }} />
                <div>
                  <strong>{club.name}</strong>
                  <small>{Object.keys(club.courts || {}).length} kortów · Szczecin</small>
                </div>
                <button type="button" onClick={onOpenCourts}>Szczegóły ›</button>
              </header>

              <div className="pa10-mobile-hours">
                {(club.hours.length ? club.hours : ["18:00", "18:30", "19:00", "19:30"]).map((hour, hourIndex) => {
                  const item = recommendations.find(
                    (slot) => slot.clubName === club.name && slot.startHour === hour
                  );
                  return (
                    <button
                      type="button"
                      className={hourIndex === 1 && item ? "selected" : ""}
                      key={`${club.slug}-${hour}`}
                      onClick={() => item ? onSelectCourt(item) : onOpenCourts()}
                    >
                      <strong>{hour}</strong>
                      <small>{item?.courtName || "sprawdź"}</small>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <button className="pa10-mobile-more" type="button" onClick={onOpenCourts}>
          Pokaż więcej klubów
        </button>

        <section className="pa10-mobile-community">
          <header>
            <h2>Szukasz gry?</h2>
            <button type="button" onClick={onOpenPlayers}>Wszyscy →</button>
          </header>
          {activePlayers.length > 0 ? activePlayers.map((player) => (
            <article key={player.id}>
              <span className="consumer-player-avatar">{player.nickname.slice(0, 1).toUpperCase()}</span>
              <div><strong>{player.nickname}</strong><small>{player.clubName} · {player.from}–{player.to}</small></div>
              <LevelBadge level={player.level} compact />
              <button type="button" onClick={() => onInvitePlayer(player)}>Zaproś</button>
            </article>
          )) : (
            <button className="pa10-empty-player" type="button" onClick={onOpenPlayers}>Dodaj zgłoszenie →</button>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomeDashboard;
