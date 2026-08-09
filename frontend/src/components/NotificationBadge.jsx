export default function NotificationBadge({ count }) {
  if (!count) return null;
  return <small className="notification-badge">{count > 99 ? "99+" : count}</small>;
}
