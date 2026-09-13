import { useMemo } from "react";

function getClubPhoto(clubName = "") {
  const name = String(clubName).toLowerCase();
  if (name.includes("arena południowa") || name.includes("arena poludniowa")) return "/premium/club-1.jpg";
  if (name.includes("padel club")) return "/premium/club-2.jpg";
  if (name.includes("fabryka energii")) return "/premium/club-3.jpg";
  return "/premium/hero-clean.jpg";
}

const FEATURED_CLUBS = [
  { name: "Padel Club", photo: "/premium/club-2.jpg" },
  { name: "Fabryka Energii", photo: "/premium/club-3.jpg" },
  { name: "Padel Arena Południowa", photo: "/premium/club-1.jpg" },
];

function MobileHomeDashboard({ recommendations = [], onOpenCourts, onSelectCourt }) {
  const unique = useMemo(() => recommendations.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.startHour === item.startHour && candidate.clubName === item.clubName && candidate.courtName === item.courtName) === index
  ), [recommendations]);
  const nearest = unique[0] || null;
  const next = unique.slice(1, 4);

  return (
    <div className="mobile-home-v4">
      <section className="mobile-home-hero-v4">
        <div className="mobile-home-hero-content-v4">
          <span className="mobile-home-kicker-v4">SZCZECIN</span>
          <h1>Padel<br />bliżej Ciebie.</h1>
          <p>Wolne terminy. Prawdziwi ludzie.</p>
        </div>
      </section>

      <section className="mobile-home-controls-v4">
        <button type="button" onClick={onOpenCourts}><span>⌖</span><strong>Szczecin</strong><b>⌄</b></button>
        <button type="button" onClick={onOpenCourts}><span>▣</span><strong>Jutro, 16:00</strong><b>⌄</b></button>
      </section>
      <button className="mobile-home-primary-v4" type="button" onClick={onOpenCourts}>Pokaż dostępne korty <span>→</span></button>

      <section className="mobile-home-section-v4">
        <header><h2>Najbliższy wolny kort</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
        {nearest ? (
          <button className="mobile-nearest-v4" type="button" onClick={() => onSelectCourt?.(nearest)}>
            <img src={getClubPhoto(nearest.clubName)} alt="" />
            <span className="mobile-nearest-copy-v4">
              <span className="mobile-free-v4"><i /> Wolny</span>
              <strong>{nearest.startHour}{nearest.endHour ? ` – ${nearest.endHour}` : ""}</strong>
              <b>{nearest.clubName}</b>
              <small>{nearest.courtName}</small>
            </span>
            <span className="mobile-nearest-arrow-v4">›</span>
          </button>
        ) : (
          <button className="mobile-nearest-v4 is-empty" type="button" onClick={onOpenCourts}>
            <span className="mobile-nearest-copy-v4"><strong>Sprawdź dostępność</strong><small>Znajdź najbliższy wolny kort.</small></span><span className="mobile-nearest-arrow-v4">›</span>
          </button>
        )}
      </section>

      {next.length > 0 && <section className="mobile-home-section-v4 mobile-next-v4">
        <header><h2>Kolejne wolne</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
        <div className="mobile-next-list-v4">
          {next.map((item) => <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}>
            <img src={getClubPhoto(item.clubName)} alt="" />
            <span><strong>{item.startHour}</strong><b>{item.clubName}</b><small>{item.courtName}</small></span><em>›</em>
          </button>)}
        </div>
      </section>}

      <section className="mobile-home-section-v4 mobile-featured-v4">
        <header><h2>Kluby w Szczecinie</h2><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
        <div className="mobile-featured-grid-v4">
          {FEATURED_CLUBS.map((club) => <button type="button" key={club.name} onClick={onOpenCourts}>
            <img src={club.photo} alt="" /><strong>{club.name}</strong><small>Sprawdź korty →</small>
          </button>)}
        </div>
      </section>
    </div>
  );
}
export default MobileHomeDashboard;
