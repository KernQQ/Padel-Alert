import { useMemo } from "react";

function getClubPhoto(clubName = "") {
  const name = String(clubName).toLowerCase();
  if (name.includes("arena południowa") || name.includes("arena poludniowa")) return "/premium/club-1.jpg";
  if (name.includes("padel club")) return "/premium/club-2.jpg";
  if (name.includes("fabryka energii")) return "/premium/club-3.jpg";
  return "/premium/hero-clean.jpg";
}

function HomeDashboard({
  recommendations = [],
  players = [],
  date,
  onOpenCourts,
  onSelectCourt,
  onOpenMatches,
  onOpenPlayers
}) {
  const unique = useMemo(() =>
    recommendations.filter((item, index, all) =>
      all.findIndex((candidate) =>
        candidate.startHour === item.startHour &&
        candidate.clubName === item.clubName &&
        candidate.courtName === item.courtName
      ) === index
    ), [recommendations]);

  const nearest = unique[0] || null;
  const next = unique.slice(1, 4);

  const clubNames = useMemo(() => {
    const names = unique.map((item) => item.clubName).filter(Boolean);
    return [...new Set(names)].slice(0, 3);
  }, [unique]);

  const openMatches = useMemo(() => {
    return players
      .filter((post) => post && post.status !== "closed" && post.autoclosed !== true)
      .slice(0, 2);
  }, [players]);

  const displayDate = useMemo(() => {
    if (!date) return "Dzisiaj";
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(parsed);
  }, [date]);

  return (
    <div className="ref-home">
      {/* Desktop-only home. Mobile version below remains structurally unchanged. */}
      <div className="padletic-desktop-home">
        <div className="pd-home-bg" aria-hidden="true"><span /></div>

        <header className="pd-topline">
          <button type="button" className="pd-city" onClick={onOpenCourts}>Szczecin <span>⌄</span></button>
          <div className="pd-manifesto">KORTY. LUDZIE. GRA.</div>
        </header>

        <section className="pd-intro">
          <h1>Padel<br /><em>bliżej Ciebie.</em></h1>
          <p>Wolne terminy. Prawdziwi ludzie. Padel w Twoim mieście.</p>
          <div className="pd-hero-filters">
            <button type="button" onClick={onOpenCourts}><span className="pd-pin">⌖</span><strong>Szczecin</strong><b>⌄</b></button>
            <button type="button" onClick={onOpenCourts}><span>▣</span><strong>{displayDate}</strong><b>⌄</b></button>
          </div>
        </section>

        <section className="pd-courts">
          <div className="pd-section-head">
            <h2>Najbliższe wolne korty</h2>
            <button type="button" onClick={onOpenCourts}>Zobacz wszystkie <span>→</span></button>
          </div>


          <div className="pd-slot-row">
            {(nearest ? [nearest, ...next] : []).map((item, index) => (
              <button
                type="button"
                className={`pd-slot ${index === 0 ? "is-primary" : ""}`}
                key={`${item.clubName}-${item.courtName}-${item.startHour}`}
                onClick={() => onSelectCourt?.(item)}
                style={{ "--pd-club-photo": `url(${getClubPhoto(item.clubName)})` }}
              >
                <time>{item.startHour}</time>
                <small>{item.courtName}</small>
                <span className="pd-status"><i />Wolny</span>
                <strong>{index === 0 ? "Zarezerwuj" : "Rezerwuj"}</strong>
              </button>
            ))}

            {!nearest && (
              <button type="button" className="pd-slot is-primary pd-slot-empty" onClick={onOpenCourts}>
                <time>—</time><small>Brak terminu</small><span className="pd-status">Sprawdź dostępność</span><strong>Szukaj</strong>
              </button>
            )}
          </div>

          {clubNames.length > 0 && (
            <div className="pd-clubs">
              <span>Wybierz klub</span>
              <div>
                <button type="button" onClick={onOpenCourts}>Wszystkie</button>
                {clubNames.map((name, index) => <button type="button" className={index === 0 ? "active" : ""} key={name} onClick={onOpenCourts}>{name}</button>)}
              </div>
            </div>
          )}
        </section>

        <section className="pd-matches">
          <div className="pd-section-head">
            <h2>Mecze — szukają graczy</h2>
            <button type="button" onClick={onOpenMatches}>Zobacz wszystkie <span>→</span></button>
          </div>

          <div className="pd-match-list">
            {openMatches.length > 0 ? openMatches.map((post) => (
              <button type="button" className="pd-match-row" key={post.id} onClick={onOpenMatches}>
                <div className="pd-match-time"><small>{post.date === date ? "Dziś" : (post.date || "Mecz")}</small><strong>{post.from || post.to || "—"}</strong></div>
                <span className="pd-level">{post.level || "•"}</span>
                <div className="pd-match-copy"><strong>{post.clubName || "Padel"}</strong><small>{post.playersNeeded ? `${post.playersNeeded} ${Number(post.playersNeeded) === 1 ? "miejsce" : "miejsca"}` : "Szukają graczy"}</small></div>
                <span className="pd-join">Dołącz</span>
              </button>
            )) : (
              <button type="button" className="pd-match-row pd-match-empty" onClick={onOpenMatches}>
                <div className="pd-match-time"><small>Teraz</small><strong>+</strong></div>
                <span className="pd-level">◎</span>
                <div className="pd-match-copy"><strong>Znajdź mecz</strong><small>Zobacz kto szuka graczy w Szczecinie.</small></div>
                <span className="pd-join">Zobacz</span>
              </button>
            )}
          </div>
        </section>

        <footer className="pd-footer">
          <strong>PADLETIC</strong><span>Padel w jednym miejscu.</span>
          <button type="button" onClick={onOpenPlayers}>Znajdź graczy →</button>
        </footer>
      </div>

      {/* Mobile home — rebuilt separately. Hidden on desktop. */}
      <div className="mobile-home-v3">
        <section className="mobile-home-hero-v3">
          <div className="mobile-home-hero-content">
            <span className="mobile-home-kicker">SZCZECIN</span>
            <h1>Padel<br />bliżej Ciebie.</h1>
            <p>Wolne terminy. Prawdziwi ludzie.</p>
          </div>
        </section>

        <section className="mobile-home-controls-v3">
          <button type="button" onClick={onOpenCourts}><span>⌖</span><strong>Szczecin</strong><b>⌄</b></button>
          <button type="button" onClick={onOpenCourts}><span>▣</span><strong>Jutro, 16:00</strong><b>⌄</b></button>
        </section>

        <button className="mobile-home-primary-v3" type="button" onClick={onOpenCourts}>
          Pokaż dostępne korty <span>→</span>
        </button>

        <section className="mobile-home-section-v3">
          <header><h2>Najbliższy wolny kort</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
          {nearest ? (
            <button className="mobile-nearest-v3" type="button" onClick={() => onSelectCourt?.(nearest)}>
              <div><span className="status-dot-v3" /> Wolny</div>
              <strong>{nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</strong>
              <b>{nearest.clubName}</b>
              <small>{nearest.courtName}</small>
              <em>Zarezerwuj →</em>
            </button>
          ) : (
            <button className="mobile-nearest-v3 is-empty" type="button" onClick={onOpenCourts}>
              <strong>Sprawdź dostępność</strong>
              <small>Znajdź najbliższy wolny kort.</small>
              <em>Szukaj →</em>
            </button>
          )}
        </section>

        <section className="mobile-home-section-v3 mobile-next-v3">
          <header><h2>Kolejne terminy</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
          <div className="mobile-next-list-v3">
            {next.length > 0 ? next.map((item) => (
              <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}>
                <time>{item.startHour}</time><span><strong>{item.clubName}</strong><small>{item.courtName}</small></span><b>→</b>
              </button>
            )) : (
              <button type="button" onClick={onOpenCourts}><time>—</time><span><strong>Zobacz wszystkie terminy</strong><small>Sprawdź dostępność kortów.</small></span><b>→</b></button>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

export default HomeDashboard;
