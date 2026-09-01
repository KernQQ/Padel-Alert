import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../services/api";
import LevelBadge from "../ui/LevelBadge";

function createCalendarFile(match) {
  const start = `${match.date.replaceAll("-", "")}T${match.from.replace(":", "")}00`;
  const end = `${match.date.replaceAll("-", "")}T${match.to.replace(":", "")}00`;
  const text = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:Padel - ${match.clubName}`,`LOCATION:${match.clubName}`,`DESCRIPTION:${match.gameType} / ${match.level}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `padel-${match.date}-${match.from.replace(":", "-")}.ics`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function MatchCenter({ match, ownerToken, onClose, onJoin, onLeave, onStatus, onRemoveParticipant, onReadiness, onEdit, onChatRead }) {
  const [tab, setTab] = useState("details");
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const endRef = useRef(null);
  const canChat = Boolean(match.isJoined || match.isOwner);

  const loadChat = useCallback(async (silent = false) => {
    if (!canChat) return;
    if (!silent) setChatLoading(true);
    try {
      const response = await apiFetch(`/matches/${match.id}/chat`, { headers: { "x-owner-token": ownerToken } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się pobrać czatu.");
      setMessages(data.messages || []); setChatError(""); onChatRead?.();
    } catch (error) { setChatError(error.message); }
    finally { if (!silent) setChatLoading(false); }
  }, [canChat, match.id, ownerToken]);

  useEffect(() => {
    if (tab !== "chat" || !canChat) return undefined;
    loadChat();
    const interval = window.setInterval(() => loadChat(true), 5000);
    return () => window.clearInterval(interval);
  }, [tab, canChat, loadChat]);

  useEffect(() => {
    if (tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = chatText.trim(); if (!text) return;
    setChatText("");
    try {
      const response = await apiFetch(`/matches/${match.id}/chat`, { method: "POST", headers: { "Content-Type": "application/json", "x-owner-token": ownerToken }, body: JSON.stringify({ text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się wysłać wiadomości.");
      setMessages((current) => [...current, data.message]); setChatError("");
    } catch (error) { setChatText(text); setChatError(error.message); }
  }

  async function deleteMessage(message) {
    if (!window.confirm("Usunąć tę wiadomość?")) return;
    const response = await apiFetch(`/matches/${match.id}/chat/${message.id}`, { method: "DELETE", headers: { "x-owner-token": ownerToken } });
    const data = await response.json();
    if (!response.ok) { setChatError(data.message || "Nie udało się usunąć wiadomości."); return; }
    setMessages((current) => current.filter((item) => item.id !== message.id));
  }

  async function share() {
    const text = `${match.clubName}\n${match.date}, ${match.from}–${match.to}\n${match.playersCount}/${match.maxPlayers} graczy\nPoziom: ${match.level}`;
    if (navigator.share) { await navigator.share({ title: "PADLETIC - mecz", text }); return; }
    await navigator.clipboard.writeText(text); window.alert("Szczegóły meczu skopiowane.");
  }

  return <div className="modal-backdrop"><div className="match-center-modal">
    <button className="modal-close" onClick={onClose}>×</button>
    <header className="match-center-header"><div><span className="eyebrow">Mecz</span><h2>{match.from}–{match.to}</h2><p>{match.clubName} · {match.date}</p></div><span className={`center-status status-${match.status}`}>{match.status === "open" ? (match.missingPlayers === 1 ? "Brakuje 1" : `Szukamy ${match.missingPlayers}`) : match.status === "full" ? "Komplet" : match.status === "confirmed" ? "Gotowi ✓" : match.status === "completed" ? "Zakończony" : "Anulowany"}</span></header>

    <nav className="match-center-tabs">
      <button className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>Szczegóły</button>
      <button className={tab === "players" ? "active" : ""} onClick={() => setTab("players")}>Gracze <span>{match.playersCount}/{match.maxPlayers}</span></button>
      <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>Czat</button>
    </nav>

    {tab === "details" && <>
      <section className="match-center-progress"><div><strong>{match.playersCount}/{match.maxPlayers}</strong><span>skład meczu</span></div><div className="center-progress-bar"><span style={{ width: `${Math.min(100,(match.playersCount / match.maxPlayers) * 100)}%` }} /></div></section>
      <section className="center-details"><article><small>Poziom</small><LevelBadge level={match.level} compact /></article><article><small>Rodzaj</small><strong>{match.gameType}</strong></article><article><small>Wolne miejsca</small><strong>{match.spotsLeft}</strong></article><article><small>Gotowi</small><strong>{match.readyCount || 0}/{match.playersCount}</strong></article>{match.courtName && <article><small>Kort</small><strong>{match.courtName}</strong></article>}</section>
      {match.note && <div className="center-note"><small>Od organizatora</small><p>{match.note}</p></div>}
      <section className="center-utility-actions"><button onClick={() => createCalendarFile(match)}>Dodaj do kalendarza</button><button onClick={share}>↗ Udostępnij</button>{match.reservationUrl && <a className="center-bo5-button" href={match.reservationUrl} target="_blank" rel="noreferrer">Przejdź do BO5</a>}</section>
    </>}

    {tab === "players" && <>
      <section className="center-players"><span className="section-kicker">Skład meczu</span><div className="center-player-grid">{Array.from({ length: match.maxPlayers }).map((_, index) => { const player = match.participants[index]; return <article key={index} className={player ? "occupied" : "empty"}><span className="center-avatar">{player ? player.nickname.slice(0,1).toUpperCase() : "＋"}</span><div><strong>{player?.nickname || "Wolne miejsce"}</strong><small>{player ? `${player.level} · ${player.preferredSide}` : "Czekamy na gracza"}</small></div>{player?.role === "organizer" && <span className="organizer-badge">Organizator</span>}{player?.ready && <span className="player-ready-badge">✓ Gotowy</span>}{match.isOwner && player && player.role !== "organizer" && <button type="button" className="remove-match-player-button" onClick={() => onRemoveParticipant(player)}>Usuń</button>}</article>; })}</div></section>
      {match.waitlist?.length > 0 && <section className="center-waitlist"><span className="section-kicker">Lista oczekujących</span>{match.waitlist.map((player,index) => <article key={`${player.nickname}-${index}`}><span>{index+1}</span><strong>{player.nickname}</strong><small>{player.level}</small></article>)}</section>}
    </>}

    {tab === "chat" && <section className="match-chat">
      {!canChat ? <div className="match-chat-locked"><strong>Czat dla uczestników</strong><p>Dołącz do meczu, aby pisać z pozostałymi graczami.</p></div> : <>
        <div className="match-chat-head"><div><strong>Czat meczu</strong><small>{match.clubName} · {match.from}–{match.to}</small></div><span><i /> {match.playersCount} uczestników</span></div>
        <div className="match-chat-messages">{chatLoading && messages.length === 0 ? <div className="match-chat-empty">Ładowanie wiadomości…</div> : messages.length === 0 ? <div className="match-chat-empty"><strong>Tu zaczyna się rozmowa 👋</strong><span>Napisz pierwszą wiadomość do ekipy.</span></div> : messages.map((message) => <article key={message.id} className={message.isMe ? "mine" : ""}><span className="match-chat-avatar">{message.nickname.slice(0,1).toUpperCase()}</span><div><header><strong>{message.isMe ? "Ty" : message.nickname}</strong><time>{formatMessageTime(message.createdAt)}</time>{message.canDelete && <button onClick={() => deleteMessage(message)} title="Usuń wiadomość">×</button>}</header><p>{message.text}</p></div></article>)}<div ref={endRef} /></div>
        {chatError && <div className="match-chat-error">{chatError}</div>}
        <form className="match-chat-compose" onSubmit={sendMessage}><input value={chatText} maxLength={1000} onChange={(e) => setChatText(e.target.value)} placeholder="Napisz wiadomość…" /><button type="submit" disabled={!chatText.trim()} aria-label="Wyślij">➤</button></form>
      </>}
    </section>}

    {tab !== "chat" && <section className="center-main-actions">
      {match.isJoined && !["cancelled","completed"].includes(match.status) && <button className={match.participants?.find((player) => player.isMe)?.ready ? "center-ready active" : "center-ready"} onClick={() => onReadiness(!match.participants?.find((player) => player.isMe)?.ready)}>{match.participants?.find((player) => player.isMe)?.ready ? "✓ Jestem gotowy" : "Potwierdź gotowość"}</button>}
      {match.isOwner && !["cancelled","completed"].includes(match.status) && <button className="center-edit" onClick={onEdit}>✎ Edytuj mecz</button>}
      {!match.isJoined && !match.isWaiting && <button className="center-primary" onClick={onJoin}>{match.status === "full" ? "Dołącz do listy oczekujących" : "Dołącz do meczu"}</button>}
      {match.isJoined && !match.isOwner && <button className="center-danger" onClick={onLeave}>Opuść mecz</button>}
      {match.isWaiting && <div className="center-waiting-message">Jesteś na liście oczekujących.</div>}
      {match.isOwner && match.status === "full" && <button className="center-primary" onClick={() => onStatus("confirmed")}>✓ Potwierdź mecz</button>}
      {match.isOwner && match.status === "confirmed" && <button className="center-primary" onClick={() => onStatus("completed")}>Zakończ mecz</button>}
      {match.isOwner && !["completed","cancelled"].includes(match.status) && <button className="center-danger" onClick={() => onStatus("cancelled")}>Anuluj mecz</button>}
    </section>}
  </div></div>;
}

export default MatchCenter;
