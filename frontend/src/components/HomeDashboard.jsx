import { useEffect, useRef, useState } from "react";
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
  onInvitePlayer,
  onChangeDate,
  onChangeFrom,
  onChangeDuration
}) {
  const topClubs = clubStats.slice(0, 3);
  const activePlayers = players.slice(0, 3);
  const nearest = recommendations[0] || null;
  const nextAvailable = recommendations
    .filter((item, index, arr) =>
      arr.findIndex((candidate) =>
        candidate.startHour === item.startHour &&
        candidate.clubName === item.clubName
      ) === index
    )
    .slice(nearest ? 1 : 0, nearest ? 5 : 4);
  const [openPicker, setOpenPicker] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    if (!openPicker) return undefined;

    const closeOnOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setOpenPicker("");
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenPicker("");
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openPicker]);
  const times = Array.from({ length: 32 }, (_, i) => { const total = 8 * 60 + i * 30; return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; });
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { value: [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"), label: i === 0 ? "Dzisiaj" : i === 1 ? "Jutro" : d.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric" }) }; });

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

      <section ref={searchRef} className="pd-home-search pd-home-search-interactive" aria-label="Szybkie wyszukiwanie kortów">
        <div className={`pd-home-field-wrap ${openPicker === "location" ? "is-open" : ""}`}><button type="button" aria-expanded={openPicker === "location"} onClick={() => setOpenPicker(openPicker === "location" ? "" : "location")}><small>Lokalizacja</small><strong>Szczecin</strong><span>⌄</span></button>{openPicker === "location" && <div className="pd-home-picker"><button className="active" type="button" onClick={() => setOpenPicker("")}>Szczecin <b>✓</b></button></div>}</div>
        <div className={`pd-home-field-wrap ${openPicker === "date" ? "is-open" : ""}`}><button type="button" aria-expanded={openPicker === "date"} onClick={() => setOpenPicker(openPicker === "date" ? "" : "date")}><small>Data</small><strong>{date || "Dzisiaj"}</strong><span>⌄</span></button>{openPicker === "date" && <div className="pd-home-picker pd-home-picker-grid">{dates.map(item => <button type="button" key={item.value} className={date === item.value ? "active" : ""} onClick={() => { onChangeDate?.(item.value); setOpenPicker(""); }}>{item.label}</button>)}</div>}</div>
        <div className={`pd-home-field-wrap ${openPicker === "time" ? "is-open" : ""}`}><button type="button" aria-expanded={openPicker === "time"} onClick={() => setOpenPicker(openPicker === "time" ? "" : "time")}><small>Godzina od</small><strong>{from || "08:00"}</strong><span>⌄</span></button>{openPicker === "time" && <div className="pd-home-picker pd-home-picker-grid pd-home-time-grid">{times.map(value => <button type="button" key={value} className={from === value ? "active" : ""} onClick={() => { onChangeFrom?.(value); setOpenPicker(""); }}>{value}</button>)}</div>}</div>
        <div className={`pd-home-field-wrap ${openPicker === "duration" ? "is-open" : ""}`}><button type="button" aria-expanded={openPicker === "duration"} onClick={() => setOpenPicker(openPicker === "duration" ? "" : "duration")}><small>Czas gry</small><strong>{duration} min</strong><span>⌄</span></button>{openPicker === "duration" && <div className="pd-home-picker">{[60,90,120].map(value => <button type="button" key={value} className={duration === value ? "active" : ""} onClick={() => { onChangeDuration?.(value); setOpenPicker(""); }}>{value} min</button>)}</div>}</div>
        <button type="button" className="pd-home-search-submit" onClick={() => { setOpenPicker(""); onOpenCourts?.(); }}>Szukaj kortów <span>→</span></button>
      </section>

      <section className="pd-home-section pd-home-availability">
        <header className="pd-home-section-head">
          <div>
            <small>DOSTĘPNOŚĆ</small>
            <h2>Najbliższe wolne</h2>
            <p>Godzina jest najważniejsza. Reszta to jeden ruch.</p>
          </div>
          <button type="button" onClick={onOpenCourts}>Wszystkie terminy →</button>
        </header>

        {nearest ? (
          <div className="pd-nearest-layout">
            <article className="pd-nearest-hero">
              <div className="pd-nearest-label">NAJBLIŻSZY WOLNY KORT</div>
              <div className="pd-nearest-time">{nearest.startHour}</div>
              <div className="pd-nearest-meta">
                <strong>{nearest.clubName}</strong>
                <span>{nearest.courtName} · dzisiaj</span>
              </div>
              <button type="button" onClick={() => onSelectCourt(nearest)}>
                ZAREZERWUJ <span>→</span>
              </button>
            </article>

            <div className="pd-nearest-next">
              <div className="pd-nearest-next-head">Kolejne terminy</div>
              {nextAvailable.map((item) => (
                <button
                  type="button"
                  key={`${item.clubName}-${item.courtKey}-${item.startHour}`}
                  onClick={() => onSelectCourt(item)}
                >
                  <strong>{item.startHour}</strong>
                  <span>{item.clubName}</span>
                  <i>→</i>
                </button>
              ))}
              <button type="button" className="pd-nearest-all" onClick={onOpenCourts}>
                Pokaż pełną dostępność
              </button>
            </div>
          </div>
        ) : (
          <div className="pd-nearest-empty">
            <strong>Brak szybkiego wyniku</strong>
            <span>Sprawdź pełną dostępność klubów.</span>
            <button type="button" onClick={onOpenCourts}>Sprawdź korty →</button>
          </div>
        )}

        <div className="pd-home-clubs pd-home-clubs-flat">
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
                />
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
                      {slots.map((item) => (
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
                    <button type="button" className="pd-home-no-slot" onClick={onOpenCourts}>
                      Sprawdź dostępność →
                    </button>
                  )}
                </div>
              </article>
            );
          })}
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
