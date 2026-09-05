import { useEffect, useMemo, useRef, useState } from "react";

function HomeDashboard({
  recommendations = [],
  duration,
  date,
  from,
  onOpenCourts,
  onChangeDate,
  onChangeFrom,
  onChangeDuration,
  onSelectCourt
}) {
  const [openPicker, setOpenPicker] = useState("");
  const rootRef = useRef(null);

  const dates = useMemo(() =>
    Array.from({ length: 7 }, (_, index) => {
      const value = new Date();
      value.setHours(12, 0, 0, 0);
      value.setDate(value.getDate() + index);
      return {
        value: [
          value.getFullYear(),
          String(value.getMonth() + 1).padStart(2, "0"),
          String(value.getDate()).padStart(2, "0")
        ].join("-"),
        label:
          index === 0
            ? "Dzisiaj"
            : index === 1
            ? "Jutro"
            : value.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric" })
      };
    }), []);

  const times = useMemo(() =>
    Array.from({ length: 32 }, (_, index) => {
      const minutes = 8 * 60 + index * 30;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    }), []);

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

  useEffect(() => {
    if (!openPicker) return undefined;
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpenPicker("");
    };
    const esc = (event) => {
      if (event.key === "Escape") setOpenPicker("");
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [openPicker]);

  const choose = (setter, value) => {
    setter?.(value);
    setOpenPicker("");
  };

  return (
    <div className="sport-home">
      <section className="sport-home-hero">
        <div className="sport-home-copy">
          <span>SZCZECIN · PADEL · COMMUNITY</span>
          <h1>KORTY<br />LUDZIE<br />GRA<i>.</i></h1>
          <p>Wolne terminy. Rezerwuj. Widzimy się na korcie.</p>
        </div>
      </section>

      <section className="sport-home-search" ref={rootRef}>
        <div className="sport-home-field">
          <button type="button" onClick={() => setOpenPicker(openPicker === "location" ? "" : "location")}>
            <small>Lokalizacja</small><strong>Szczecin</strong><b>⌄</b>
          </button>
          {openPicker === "location" && (
            <div className="sport-popover sport-popover-one">
              <button className="selected" type="button" onClick={() => setOpenPicker("")}>Szczecin <span>✓</span></button>
            </div>
          )}
        </div>

        <div className="sport-home-field">
          <button type="button" onClick={() => setOpenPicker(openPicker === "date" ? "" : "date")}>
            <small>Data</small><strong>{date}</strong><b>⌄</b>
          </button>
          {openPicker === "date" && (
            <div className="sport-popover sport-popover-grid">
              {dates.map((item) => (
                <button key={item.value} className={date === item.value ? "selected" : ""} type="button" onClick={() => choose(onChangeDate, item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sport-home-field">
          <button type="button" onClick={() => setOpenPicker(openPicker === "time" ? "" : "time")}>
            <small>Od godziny</small><strong>{from || "08:00"}</strong><b>⌄</b>
          </button>
          {openPicker === "time" && (
            <div className="sport-popover sport-popover-times">
              {times.map((value) => (
                <button key={value} className={from === value ? "selected" : ""} type="button" onClick={() => choose(onChangeFrom, value)}>
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sport-home-field">
          <button type="button" onClick={() => setOpenPicker(openPicker === "duration" ? "" : "duration")}>
            <small>Czas gry</small><strong>{duration} min</strong><b>⌄</b>
          </button>
          {openPicker === "duration" && (
            <div className="sport-popover sport-popover-one">
              {[60, 90, 120].map((value) => (
                <button key={value} className={duration === value ? "selected" : ""} type="button" onClick={() => choose(onChangeDuration, value)}>
                  {value} min
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="sport-home-submit" onClick={() => { setOpenPicker(""); onOpenCourts?.(); }}>
          Szukaj kortów <span>→</span>
        </button>
      </section>

      <section className="sport-nearest">
        <div className="sport-nearest-main">
          <small>NAJBLIŻSZY WOLNY KORT</small>
          {nearest ? (
            <>
              <strong className="sport-nearest-time">{nearest.startHour}</strong>
              <h2>{nearest.clubName}</h2>
              <p>{nearest.courtName} · {nearest.endHour ? `${nearest.startHour}–${nearest.endHour}` : "dzisiaj"}</p>
              <button type="button" onClick={() => onSelectCourt?.(nearest)}>ZAREZERWUJ <span>→</span></button>
            </>
          ) : (
            <>
              <strong className="sport-nearest-time">—</strong>
              <h2>Sprawdź dostępność</h2>
              <p>Nie mamy jeszcze szybkiego wyniku.</p>
              <button type="button" onClick={onOpenCourts}>ZOBACZ KORTY <span>→</span></button>
            </>
          )}
        </div>

        <div className="sport-nearest-list">
          <small>KOLEJNE TERMINY</small>
          {next.length > 0 ? next.map((item) => (
            <button key={`${item.clubName}-${item.courtName}-${item.startHour}`} type="button" onClick={() => onSelectCourt?.(item)}>
              <strong>{item.startHour}</strong>
              <span>{item.clubName}</span>
              <em>{item.courtName}</em>
              <b>→</b>
            </button>
          )) : (
            <p className="sport-nearest-muted">Pełna lista pojawi się po wyszukaniu dostępności.</p>
          )}
          <button className="sport-nearest-all" type="button" onClick={onOpenCourts}>Zobacz wszystkie →</button>
        </div>
      </section>
    </div>
  );
}

export default HomeDashboard;
