export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <button className="app-toast" onClick={onClose}>
      {message}<span>×</span>
    </button>
  );
}
