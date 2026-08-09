import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import LevelBadge from "./ui/LevelBadge";
import { useRealtime } from "../hooks/useRealtime";

function statusLabel(status) {
  if (status === "full") return "Komplet";
  if (status === "confirmed") return "Potwierdzony";
  if (status === "completed") return "Zakończony";
  if (status === "cancelled") return "Anulowany";
  return "Szukamy graczy";
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
        throw new Error(data.message || "Nie udało się pobrać meczów.");
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
        `Anulować cały mecz w ${match.clubName} (${match.date}, ${match.from})?`
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
        throw new Error(data.message || "Nie udało się anulować meczu.");
      }

      setMessage("Mecz anulowany — uczestnicy dostali powiadomienie.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMatch(match) {
    if (!window.confirm("Usunąć ten mecz na stałe z Twojej listy?")) {
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
        throw new Error(data.message || "Nie udało się usunąć meczu.");
      }

      setMessage("Mecz został usunięty.");
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
          <span className="section-kicker">ORGANIZATOR</span>
          <h2>Moje mecze</h2>
        </div>
        <span className="my-matches-count">{matches.length}</span>
      </div>

      {message && (
        <button
          type="button"
          className="my-match-message"
          onClick={() => setMessage("")}
        >
          {message}
          <span>×</span>
        </button>
      )}

      <div className="my-match-list">
        {matches.map((match) => (
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
                <span className="my-match-status">
                  {statusLabel(match.status)}
                </span>
              </div>

              <div className="my-match-meta">
                <LevelBadge level={match.level} compact />
                <span>
                  👥 {match.playersCount}/{match.maxPlayers}
                </span>
                <span>🎾 {match.gameType}</span>
              </div>
            </div>

            <div className="my-match-actions">
              {!["cancelled", "completed"].includes(match.status) ? (
                <button
                  type="button"
                  className="my-match-cancel"
                  disabled={busyId === match.id}
                  onClick={() => cancelMatch(match)}
                >
                  Anuluj mecz
                </button>
              ) : (
                <button
                  type="button"
                  className="my-match-delete"
                  disabled={busyId === match.id}
                  onClick={() => deleteMatch(match)}
                >
                  Usuń
                </button>
              )}
            </div>
          </article>
        ))}

        {matches.length === 0 && (
          <div className="empty-state large">
            Nie organizujesz jeszcze żadnego meczu.
          </div>
        )}
      </div>
    </section>
  );
}

export default MyMatchesPanel;
