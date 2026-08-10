export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : `http://${window.location.hostname}:3000`);
export const REFRESH_SECONDS = 60;

export const DURATIONS = [
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "120 min" }
];

export const NAVIGATION = [
  { id: "home", label: "Start", icon: "" },
  { id: "courts", label: "Korty", icon: "" },
  { id: "matches", label: "Mecze", icon: "" },
  { id: "partners", label: "Gracze", icon: "" },
  { id: "saved", label: "Moje", icon: "" }
];
