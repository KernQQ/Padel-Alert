import { useMemo } from "react";

function MobileHomeDashboard({ recommendations = [], onOpenCourts, onSelectCourt }) {
  const unique = useMemo(() => recommendations.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.startHour === item.startHour && candidate.clubName === item.clubName && candidate.courtName === item.courtName) === index
  ), [recommendations]);
  const nearest = unique[0] || null;
  const next = unique.slice(1, 5);

  return (
    <div className="mobile-home-v3">
      <section className="mobile-home-hero-v3"><div className="mobile-home-hero-content"><span className="mobile-home-kicker">SZCZECIN</span><h1>Padel<br />bliżej Ciebie.</h1><p>Wolne terminy. Prawdziwi ludzie.</p></div></section>
      <section className="mobile-home-controls-v3">
        <button type="button" onClick={onOpenCourts}><span>⌖</span><strong>Szczecin</strong><b>⌄</b></button>
        <button type="button" onClick={onOpenCourts}><span>▣</span><strong>Jutro, 16:00</strong><b>⌄</b></button>
      </section>
      <button className="mobile-home-primary-v3" type="button" onClick={onOpenCourts}>Pokaż dostępne korty <span>→</span></button>
      <section className="mobile-home-section-v3">
        <header><h2>Najbliższy wolny kort</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
        {nearest ? <button className="mobile-nearest-v3" type="button" onClick={() => onSelectCourt?.(nearest)}><div><span className="status-dot-v3" /> Wolny</div><strong>{nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</strong><b>{nearest.clubName}</b><small>{nearest.courtName}</small><em>Zarezerwuj →</em></button> : <button className="mobile-nearest-v3 is-empty" type="button" onClick={onOpenCourts}><strong>Sprawdź dostępność</strong><small>Znajdź najbliższy wolny kort.</small><em>Szukaj →</em></button>}
      </section>
      <section className="mobile-home-section-v3 mobile-next-v3">
        <header><h2>Kolejne terminy</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
        <div className="mobile-next-list-v3">
          {next.length > 0 ? next.map((item) => <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}><time>{item.startHour}</time><span><strong>{item.clubName}</strong><small>{item.courtName}</small></span><b>→</b></button>) : <button type="button" onClick={onOpenCourts}><time>—</time><span><strong>Zobacz wszystkie terminy</strong><small>Sprawdź dostępność kortów.</small></span><b>→</b></button>}
        </div>
      </section>
    </div>
  );
}
export default MobileHomeDashboard;
