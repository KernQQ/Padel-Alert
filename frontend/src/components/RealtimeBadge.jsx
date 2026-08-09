function RealtimeBadge({ status }) {
  const text =
    status === "connected"
      ? "LIVE"
      : status === "reconnecting"
      ? "Łączenie..."
      : status === "offline"
      ? "Offline"
      : "Łączenie...";

  return (
    <span className={`realtime-badge realtime-${status}`}>
      <span />
      {text}
    </span>
  );
}

export default RealtimeBadge;
