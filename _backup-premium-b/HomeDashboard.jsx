import LevelBadge from "./ui/LevelBadge";

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
  const nextSlots = recommendations.slice(0, 3);
  const activePlayers = players.slice(0, 3);
  const times = [...new Set(nextSlots.map((x) => x.startHour))].slice(0, 4);

  return (
    <div className="premium-home">
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-kicker">SZCZECIN · LIVE</span>
          <h1><small>ZNAJDŹ. ZAREZERWUJ.</small><strong>GRAJ.</strong></h1>
          <p>Sprawdzamy dostępność kortów za Ciebie. Ty grasz.</p>
        </div>
        <div className="premium-hero-art" aria-hidden="true" />
        <button className="premium-hero-cta" type="button" onClick={onOpenCourts}>Szukaj kortów <span>→</span></button>
      </section>

      <section className="premium-quick-search" onClick={onOpenCourts} role="button" tabIndex="0">
        <div><span>Lokalizacja</span><strong>Szczecin</strong></div>
        <div><span>Data</span><strong>Dzisiaj</strong></div>
        <div><span>Godzina od</span><strong>17:00</strong></div>
        <div><span>Czas gry</span><strong>{duration} min</strong></div>
        <div><span>Gracze</span><strong>2–4</strong></div>
        <button type="button" onClick={onOpenCourts}>Pełna wyszukiwarka <span>→</span></button>
      </section>

      <div className="premium-home-grid">
        <section className="premium-panel premium-availability">
          <header>
            <div><h2>Dostępność kortów</h2><p>Najbliższe wolne terminy w Szczecinie</p></div>
            <button type="button" onClick={onOpenCourts}>Pełna wyszukiwarka →</button>
          </header>
          <div className="premium-date-tabs"><b>Dzisiaj</b><span>Jutro</span><span>Piątek</span><span>Weekend</span><small>odświeżenie za {countdown}s</small></div>
          <div className="premium-table">
            <div className="premium-table-head"><span>KLUB / KORT</span>{(times.length ? times : ["17:00","17:30","18:00","18:30"]).map(t => <span key={t}>{t}</span>)}</div>
            {clubStats.slice(0,3).map((club, idx) => {
              const clubSlots = nextSlots.filter(x => x.clubSlug === club.slug);
              return <div className="premium-table-row" key={club.slug}>
                <div className="premium-club-cell"><i>{club.name.slice(0,1)}</i><span><strong>{club.name}</strong><small>{Object.keys(club.courts || {}).length} kortów</small></span></div>
                {(times.length ? times : ["17:00","17:30","18:00","18:30"]).map((t,j) => {
                  const hit = clubSlots.find(x => x.startHour === t) || (clubSlots[0] && j === idx ? clubSlots[0] : null);
                  return hit ? <button key={t} type="button" className="premium-slot" onClick={() => onSelectCourt(hit)}>{duration} min</button> : <span className="premium-slot-empty" key={t}>—</span>;
                })}
              </div>
            })}
          </div>
          {clubStats.length === 0 && <div className="premium-empty">Ładowanie klubów i dostępności…</div>}
        </section>

        <aside className="premium-side">
          <section className="premium-panel">
            <header><h3>Kluby w Szczecinie</h3><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
            <div className="premium-map"><span>1</span><span>2</span><span>3</span></div>
            <div className="premium-clubs">{clubStats.slice(0,3).map((club,i)=><button type="button" key={club.slug} onClick={onOpenCourts}><i>{i+1}</i><span><strong>{club.name}</strong><small>{Object.keys(club.courts || {}).length} kortów{club.available ? ` · ${club.available} wolnych` : ""}</small></span><b>→</b></button>)}</div>
          </section>
          <section className="premium-panel premium-nearest">
            <header><h3>Najbliższe wolne</h3><button type="button" onClick={onOpenCourts}>Wszystkie →</button></header>
            {nextSlots.length ? nextSlots.map(item => <button type="button" key={`${item.courtKey}-${item.startHour}`} onClick={()=>onSelectCourt(item)}><time>{item.startHour}</time><span><strong>{item.clubName}</strong><small>{item.courtName} · {duration} min</small></span><b>→</b></button>) : <p className="premium-muted">Brak wolnych terminów w ostatnim wyszukiwaniu.</p>}
          </section>
        </aside>
      </div>

      <section className="premium-features">
        <button type="button" onClick={onOpenCourts}><i>◉</i><span><strong>Live dostępność</strong><small>Sprawdzamy korty w czasie rzeczywistym</small></span></button>
        <button type="button" onClick={onOpenCourts}><i>⌕</i><span><strong>Bez szukania</strong><small>Wszystkie kluby w jednym miejscu</small></span></button>
        <button type="button" onClick={onOpenMatches}><i>ϟ</i><span><strong>Szybka rezerwacja</strong><small>Przejdź do systemu klubu jednym kliknięciem</small></span></button>
        <button type="button" onClick={onOpenSaved}><i>♧</i><span><strong>Powiadomienia</strong><small>Ustaw alert i nie przegap terminu</small></span></button>
      </section>

      {activePlayers.length > 0 && <section className="premium-panel premium-players"><header><h3>Gracze szukający gry</h3><button onClick={onOpenPlayers}>Wszyscy →</button></header>{activePlayers.map(player => <article key={player.id}><i>{player.nickname.slice(0,1).toUpperCase()}</i><span><strong>{player.nickname}</strong><small>{player.clubName} · {player.from}–{player.to}</small></span><LevelBadge level={player.level} compact/><button onClick={()=>onInvitePlayer(player)}>Zaproś</button></article>)}</section>}
    </div>
  );
}

export default HomeDashboard;
