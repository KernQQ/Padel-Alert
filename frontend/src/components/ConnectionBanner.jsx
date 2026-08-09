import { useEffect, useState } from "react";

function ConnectionBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine);
    }

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;

  return (
    <div className="connection-banner">
      <span>●</span>
      Brak internetu. PadelAlert wróci do trybu LIVE po odzyskaniu połączenia.
    </div>
  );
}

export default ConnectionBanner;
