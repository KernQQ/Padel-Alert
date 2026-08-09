export function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(`${date}T12:00:00`));
}

export function formatShortDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${date}T12:00:00`));
}

export function getAvatarHue(value) {
  return [...String(value || "G")].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0
  ) % 360;
}
