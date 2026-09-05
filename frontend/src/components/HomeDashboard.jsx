import { useMemo } from "react";

function HomeDashboard({ recommendations = [], onOpenCourts, onSelectCourt }) {
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
            <div><strong>{nearest.clubName}</strong><small>{nearest.courtName} · {nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</small></div>
            <b>›</b>
          </button>
        ) : (
          <button className="ref-nearest-card" type="button" onClick={onOpenCourts}>
            <time>—</time><div><strong>Sprawdź dostępność</strong><small>Znajdź najbliższy wolny kort.</small></div><b>›</b>
          </button>
        )}
      </section>

      <section className="ref-home-next">
        <h3>Kolejne terminy</h3>
        {next.length > 0 ? next.map((item) => (
          <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}>
            <time>{item.startHour}</time><div><strong>{item.clubName}</strong><small>{item.courtName}</small></div><b>→</b>
          </button>
        )) : (
          <button type="button" onClick={onOpenCourts}>
            <time>—</time><div><strong>Zobacz wszystkie terminy</strong><small>Sprawdź dostępność kortów.</small></div><b>→</b>
          </button>
        )}
      </section>
    </div>
  );
}

export default HomeDashboard;
