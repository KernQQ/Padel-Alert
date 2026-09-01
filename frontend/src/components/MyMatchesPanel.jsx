import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import LevelBadge from "./ui/LevelBadge";
import { useRealtime } from "../hooks/useRealtime";

function statusLabel(status) {
  if (status === "full") return "Komplet";
  if (status === "confirmed") return "Potwierdzony";
  if (status === "completed") return "ZakoĹ„czony";
  if (status === "cancelled") return "Anulowany";
  return "Szukamy graczy";
}

function isPastMatch(match) {
  return ["completed", "cancelled"].includes(match.status);
}

function MyMatchesPanel({ ownerToken, refreshSignal = 0 }) {
  const [matches, setMatches] = useState([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/matches?status=all", {
        headers: {
          "x-owner-token": ownerToken
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Nie udaĹ‚o siÄ™ pobraÄ‡ meczĂłw.");
      }

      setMatches(
        (data.matches || [])
          .filter((match) => match.isOwner)
          .sort((first, second) =>
            `${first.date}T${first.from}`.localeCompare(
              `${second.date}T${second.from}`
            )
          )
      );
    } catch (error) {
      setMessage(error.message);
    }
  }, [ownerToken]);

  useRealtime({
    ownerToken,
    onMatchesChanged: load
  });

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  async function cancelMatch(match) {
    if (
      !window.confirm(
        `AnulowaÄ‡ caĹ‚y mecz w ${match.clubName} (${match.date}, ${match.from})?`
      )
    ) {
      return;
    }

    setBusyId(match.id);

    try {
      const response = await apiFetch(`/matches/${match.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken
        },
        body: JSON.stringify({ status: "cancelled" })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Nie udaĹ‚o siÄ™ anulowaÄ‡ meczu.");
      }

      setMessage("Mecz anulowany â€” uczestnicy dostali powiadomienie.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMatch(match) {
    if (!window.confirm("UsunÄ…Ä‡ ten mecz na staĹ‚e z Twojej listy?")) {
      return;
    }

    setBusyId(match.id);

    try {
      const response = await apiFetch(`/matches/${match.id}`, {
        method: "DELETE",
        headers: {
          "x-owner-token": ownerToken
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Nie udaĹ‚o siÄ™ usunÄ…Ä‡ meczu.");
      }

      setMessage("Mecz zostaĹ‚ usuniÄ™ty.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="owner-posts-section my-matches-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Mecze</span>
          <h2>Moje mecze</h2>
        </div>
        {matches.length > 0 && <span className="my-matches-count">{matches.length}</span>}
      </div>

      {message && (
        <button
          type="button"
          className="my-match-message"
          onClick={() => setMessage("")}
        >
          {message}
          <span>Ă—</span>
        </button>
      )}

      <div className="v6-match-summary">
        <span><strong>{matches.filter((match) => !isPastMatch(match)).length}</strong> nadchodzÄ…cych</span>
        <span><strong>{matches.filter((match) => match.status === "completed").length}</strong> zakoĹ„czonych</span>
      </div>

      <div className="my-match-list">
        {matches.filter((match) => !isPastMatch(match)).map((match) => (
          <article
            key={match.id}
            className={`my-match-card status-${match.status}`}
          >
            <div className="my-match-date">
              <strong>{match.from}</strong>
              <small>{match.date}</small>
            </div>

            <div className="my-match-info">
              <div className="my-match-title-row">
                <strong>{match.clubName}</strong>
                <span className="my-match-status">{statusLabel(match.status)}</span>
              </div>

              <div className="my-match-meta">
                <LevelBadge level={match.level} compact />
                <span>{match.playersCount}/{match.maxPlayers} graczy</span>
                <span>{match.gameType}</span>
              </div>
            </div>

            <div className="my-match-actions">
              <button
                type="button"
                className="my-match-cancel"
                disabled={busyId === match.id}
                onClick={() => cancelMatch(match)}
              >
                Anuluj mecz
              </button>
            </div>
          </article>
        ))}

        {matches.filter((match) => !isPastMatch(match)).length === 0 && (
          <div className="empty-state my-matches-empty">
            <span className="my-empty-icon">â–Ł</span>
            <div>
              <strong>Brak nadchodzÄ…cych meczĂłw.</strong>
              <p>Gdy utworzysz mecz, pojawi siÄ™ tutaj.</p>
            </div>
          </div>
        )}
      </div>

      {matches.some(isPastMatch) && (
        <details className="v6-match-history">
          <summary>Historia meczĂłw ({matches.filter(isPastMatch).length})</summary>
          <div className="my-match-list">
            {matches.filter(isPastMatch).map((match) => (
              <article
                key={match.id}
                className={`my-match-card status-${match.status}`}
              >
                <div className="my-match-date">
                  <strong>{match.from}</strong>
                  <small>{match.date}</small>
                </div>
                <div className="my-match-info">
                  <div className="my-match-title-row">
                    <strong>{match.clubName}</strong>
                    <span className="my-match-status">{statusLabel(match.status)}</span>
                  </div>
                  <div className="my-match-meta">
                    <LevelBadge level={match.level} compact />
                    <span>{match.playersCount}/{match.maxPlayers} graczy</span>
                    <span>{match.gameType}</span>
                  </div>
                </div>
                <div className="my-match-actions">
                  <button
                    type="button"
                    className="my-match-delete"
                    disabled={busyId === match.id}
                    onClick={() => deleteMatch(match)}
                  >
                    UsuĹ„
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export default MyMatchesPanel;

