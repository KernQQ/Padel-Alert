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

      {/* Mobile home — redesigned for iOS + Android. Desktop remains isolated above. */}
      <div className="ref-home-mobile pdm-home">
        <section className="pdm-hero">
          <div className="pdm-hero-photo" aria-hidden="true" style={{ backgroundImage: "url(/assets/padletic-players-sunset.jpg)" }} />
          <div className="pdm-hero-shade" aria-hidden="true" />
          <div className="pdm-hero-content">
            <div className="pdm-kicker">Szczecin</div>
            <h1>Padel<br />bliżej Ciebie<span>.</span></h1>
            <p>Wolne terminy. Prawdziwi ludzie.</p>
          </div>
        </section>

        <div className="pdm-filters">
          <button type="button" onClick={onOpenCourts}><span>⌖</span><strong>Szczecin</strong><b>⌄</b></button>
          <button type="button" onClick={onOpenCourts}><span>▣</span><strong>{displayDate}</strong><b>›</b></button>
        </div>

        <section className="pdm-nearest">
          <header className="pdm-section-head">
            <h2>Najbliższy wolny kort</h2>
            <button type="button" onClick={onOpenCourts}>Wszystkie <span>→</span></button>
          </header>
          {nearest ? (
            <button className="pdm-nearest-card" type="button" onClick={() => onSelectCourt?.(nearest)}>
              <div className="pdm-nearest-thumb" aria-hidden="true" style={{ backgroundImage: `url(${getClubPhoto(nearest.clubName)})` }} />
              <div className="pdm-nearest-info">
                <span className="pdm-free-pill"><i /> Wolny</span>
                <time>{nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</time>
                <strong>{nearest.clubName}</strong>
                <small>{nearest.courtName}</small>
                <span className="pdm-book">Zarezerwuj <b>→</b></span>
              </div>
            </button>
          ) : (
            <button className="pdm-nearest-card pdm-nearest-empty" type="button" onClick={onOpenCourts}>
              <div className="pdm-nearest-info">
                <time>—</time><strong>Sprawdź dostępność</strong><small>Znajdź najbliższy wolny kort.</small>
                <span className="pdm-book">Szukaj <b>→</b></span>
              </div>
            </button>
          )}
        </section>

        <section className="pdm-next">
          <header className="pdm-section-head">
            <h2>Kolejne terminy</h2>
            <button type="button" onClick={onOpenCourts}>Wszystkie <span>→</span></button>
          </header>
          <div className="pdm-next-list">
            {next.length > 0 ? next.map((item) => (
              <button
                key={`${item.clubName}-${item.courtName}-${item.startHour}`}
                type="button"
                onClick={() => onSelectCourt?.(item)}
                style={{ "--pdm-club-photo": `url(${getClubPhoto(item.clubName)})` }}
              >
                <span className="pdm-next-thumb" aria-hidden="true" />
                <time>{item.startHour}</time>
                <div><strong>{item.clubName}</strong><small>{item.courtName}</small></div>
                <span className="pdm-free-dot"><i /> Wolny</span>
                <b>›</b>
              </button>
            )) : (
              <button type="button" onClick={onOpenCourts}>
                <time>—</time><div><strong>Zobacz terminy</strong><small>Sprawdź dostępność kortów.</small></div><b>›</b>
              </button>
            )}
          </div>
        </section>

        <section className="pdm-matches">
          <header className="pdm-section-head">
            <h2>Mecze — szukają graczy</h2>
            <button type="button" onClick={onOpenMatches}>Wszystkie <span>→</span></button>
          </header>
          <div className="pdm-match-list">
            {openMatches.length > 0 ? openMatches.map((post) => (
              <button key={post.id} type="button" onClick={onOpenMatches}>
                <div className="pdm-match-time"><small>{post.date === date ? "Dziś" : "Mecz"}</small><strong>{post.from || post.to || "—"}</strong></div>
                <span className="pdm-match-icon">♙</span>
                <div className="pdm-match-copy"><strong>{post.clubName || "Padel"}</strong><small>{post.level ? `Poziom ${post.level}` : "Szukają graczy"}{post.playersNeeded ? ` · ${post.playersNeeded} miejsca` : ""}</small></div>
                <span className="pdm-join">Dołącz</span>
              </button>
            )) : (
              <button type="button" onClick={onOpenMatches}>
                <div className="pdm-match-time"><small>Teraz</small><strong>+</strong></div><span className="pdm-match-icon">◎</span><div className="pdm-match-copy"><strong>Znajdź mecz</strong><small>Zobacz kto szuka graczy.</small></div><span className="pdm-join">Zobacz</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomeDashboard;
