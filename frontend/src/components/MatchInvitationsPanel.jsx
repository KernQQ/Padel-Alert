import {
  useCallback,
  useEffect,
  useState
} from "react";
import { apiFetch } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";
import LevelBadge from "./ui/LevelBadge";

function MatchInvitationsPanel({ ownerToken }) {
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(
        "/matches/invitations",
        {
          headers: {
            "x-owner-token": ownerToken
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Nie udało się pobrać zaproszeń."
        );
      }

      setInvitations(data.invitations || []);
    } catch (error) {
      setMessage(error.message);
    }
  }, [ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime({
    ownerToken,
    onMatchesChanged: load
  });

  async function answer(invitation, decision) {
    setBusyId(invitation.id);
    setMessage("");

    try {
      const response = await apiFetch(
        `/matches/invitations/${invitation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-owner-token": ownerToken
          },
          body: JSON.stringify({ decision })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Nie udało się odpowiedzieć."
        );
      }

      setMessage(
        decision === "accepted"
          ? "Dołączyłeś do meczu. "
          : "Zaproszenie odrzucone."
      );

      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  if (invitations.length === 0 && !message) {
    return null;
  }

  return (
    <section className="match-invitations-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">
            ZAPROSZENIA DO MECZU
          </span>
          <h2>
            {invitations.length}{" "}
            {invitations.length === 1
              ? "nowe zaproszenie"
              : "nowych zaproszeń"}
          </h2>
        </div>
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

      <div className="match-invitation-list">
        {invitations.map((invitation) => {
          const match = invitation.match;

          return (
            <article key={invitation.id}>
              <div className="invitation-date">
                <strong>{match.from}</strong>
                <small>{match.date}</small>
              </div>

              <div className="invitation-info">
                <span className="invitation-from">
                  {invitation.organizerName} zaprasza
                </span>

                <strong>{match.clubName}</strong>

                <div>
                  <LevelBadge
                    level={match.level}
                    compact
                  />
                  <span>
                     {match.playersCount}/{match.maxPlayers}
                  </span>
                  {match.courtName && (
                    <span> {match.courtName}</span>
                  )}
                </div>
              </div>

              <div className="invitation-actions">
                <button
                  type="button"
                  className="invitation-accept"
                  disabled={busyId === invitation.id}
                  onClick={() =>
                    answer(invitation, "accepted")
                  }
                >
                  Akceptuj
                </button>

                <button
                  type="button"
                  className="invitation-reject"
                  disabled={busyId === invitation.id}
                  onClick={() =>
                    answer(invitation, "rejected")
                  }
                >
                  Odrzuć
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MatchInvitationsPanel;
