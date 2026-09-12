import { useMemo } from "react";

function HomeDashboard({
  recommendations = [],
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
  const next = unique.slice(1, 5);

  return (
    <div className="ref-home">
      <div className="desktop-home-video" aria-hidden="true">
        <video className="desktop-home-video-media" autoPlay muted loop playsInline preload="metadata">
          <source src="/padel-bg.webm" type="video/webm" />
          <source src="/padel-bg.mp4" type="video/mp4" />
        </video>
        <div className="desktop-home-video-shade" />
      </div>

      <section className="ref-home-hero">
        <div className="ref-home-hero-copy">
          <span>SZCZECIN · PADEL · COMMUNITY</span>
          <h1>KORTY<br />LUDZIE<br />GRA.</h1>
          <p>Wolne terminy. Rezerwuj. Widzimy się na korcie.</p>
        </div>
      </section>

      <button className="ref-home-search" type="button" onClick={onOpenCourts}>
        <span>⌕</span><strong>Szczecin</strong><b>→</b>
      </button>

      <section className="ref-home-nearest">
        <header>
          <h2>Najbliższy wolny kort</h2>
          <button type="button" onClick={onOpenCourts}>Zobacz wszystkie →</button>
        </header>
        {nearest ? (
          <button className="ref-nearest-card" type="button" onClick={() => onSelectCourt?.(nearest)}>
            <time>{nearest.startHour}</time>
            <div className="ref-nearest-copy"><strong>{nearest.clubName}</strong><small>{nearest.courtName} · {nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</small></div>
            <b className="ref-mobile-arrow">›</b>
            <span className="ref-nearest-badge ref-desktop-only">WOLNY</span>
            <span className="ref-nearest-cta ref-desktop-only">Zarezerwuj <b>→</b></span>
          </button>
        ) : (
          <button className="ref-nearest-card" type="button" onClick={onOpenCourts}>
            <time>—</time><div className="ref-nearest-copy"><strong>Sprawdź dostępność</strong><small>Znajdź najbliższy wolny kort.</small></div><b className="ref-mobile-arrow">›</b><span className="ref-nearest-cta ref-desktop-only">Sprawdź <b>→</b></span>
          </button>
        )}
      </section>

      <section className="ref-home-next">
        <div className="ref-home-next-head"><h3>Kolejne terminy</h3><button type="button" onClick={onOpenCourts}>Zobacz wszystkie →</button></div>
        {next.length > 0 ? next.map((item) => (
          <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}>
            <time>{item.startHour}</time><div><strong>{item.clubName}</strong><small>{item.courtName}</small></div><span className="ref-free ref-desktop-only"><i />Wolny</span><b>→</b>
          </button>
        )) : (
          <button type="button" onClick={onOpenCourts}>
            <time>—</time><div><strong>Zobacz wszystkie terminy</strong><small>Sprawdź dostępność kortów.</small></div><span className="ref-free ref-desktop-only"><i />Sprawdź</span><b>→</b>
          </button>
        )}
      </section>

      <section className="ref-home-actions ref-desktop-only" aria-label="Szybkie akcje">
        <button type="button" onClick={onOpenCourts}><span className="ref-action-icon">▣</span><span><strong>Zobacz wszystkie terminy</strong><small>Sprawdź dostępność na wszystkich kortach.</small></span><b>→</b></button>
        <button type="button" onClick={onOpenPlayers}><span className="ref-action-icon">♙</span><span><strong>Znajdź graczy</strong><small>Dołącz do meczów i poznaj nowych ludzi.</small></span><b>→</b></button>
        <button type="button" onClick={onOpenMatches}><span className="ref-action-icon">♜</span><span><strong>Weź udział w meczu</strong><small>Graj, zdobywaj doświadczenie, baw się!</small></span><b>→</b></button>
      </section>
    </div>
  );
}

export default HomeDashboard;
