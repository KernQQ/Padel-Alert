import { useEffect, useRef, useState } from "react";
import { API_URL } from "../services/api";

export function useRealtime({
  ownerToken,
  onMatchesChanged,
  onCommunityChanged
}) {
  const [status, setStatus] = useState("connecting");
  const callbacks = useRef({
    onMatchesChanged,
    onCommunityChanged
  });

  useEffect(() => {
    callbacks.current = {
      onMatchesChanged,
      onCommunityChanged
    };
  }, [onMatchesChanged, onCommunityChanged]);

  useEffect(() => {
    let source;
    let closed = false;

    try {
      const query = ownerToken
        ? `?ownerToken=${encodeURIComponent(ownerToken)}`
        : "";

      source = new EventSource(`${API_URL}/events${query}`);

      source.addEventListener("connected", () => {
        if (!closed) setStatus("connected");
      });

      source.addEventListener("padelalert", (event) => {
        if (closed) return;

        setStatus("connected");

        try {
          const data = JSON.parse(event.data);

          if (data.type === "matches.changed") {
            callbacks.current.onMatchesChanged?.(data);
          }

          if (data.type === "community.changed") {
            callbacks.current.onCommunityChanged?.(data);
          }
        } catch {
          // A malformed realtime event should never crash the app.
        }
      });

      source.onerror = () => {
        if (!closed) setStatus("reconnecting");
      };
    } catch {
      setStatus("offline");
    }

    return () => {
      closed = true;
      source?.close();
    };
  }, [ownerToken]);

  return status;
}
