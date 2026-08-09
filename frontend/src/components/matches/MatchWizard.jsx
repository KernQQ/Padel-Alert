import { useState } from "react";
import { apiFetch } from "../../services/api";
import LevelSelect from "../ui/LevelSelect";

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function MatchWizard({
  clubs,
  profile,
  ownerToken,
  onClose,
  onCreated,
  initialData = null,
  editMatchId = null
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    clubSlug:
      initialData?.clubSlug ||
      profile.favoriteClubSlug ||
      "all",
    date: initialData?.date || today(),
    from: initialData?.from || "18:00",
    to: initialData?.to || "20:00",
    level: initialData?.level || profile.level || "3.0",
    gameType: initialData?.gameType || "Rekreacja",
    courtId: initialData?.courtId || null,
    courtName: initialData?.courtName || "",
    courtType: initialData?.courtType || "",
    reservationUrl: initialData?.reservationUrl || "",
    suggestedPlayers: initialData?.suggestedPlayers || [],
    note:
      initialData?.note ||
      (initialData?.suggestedPlayers?.length
        ? `Matchmaking: ${initialData.suggestedPlayers
            .map((player) => player.nickname)
            .join(", ")}`
        : "")
  }));

  const selectedClub = clubs.find(
    (club) => club.slug === form.clubSlug
  );

  async function createMatch() {
    setError("");

    const response = await apiFetch(
      editMatchId ? `/matches/${editMatchId}` : "/matches",
      {
      method: editMatchId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({
        ...form,
        clubName:
          form.clubSlug === "all"
            ? "Dowolny klub"
            : selectedClub?.name || form.clubSlug,
        inviteOwnerTokens: (form.suggestedPlayers || []).map(
          (player) => player.ownerToken
        ),
        maxPlayers: 4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Nie udało się utworzyć meczu.");
      return;
    }

    onCreated(data.match);
  }

  return (
    <div className="modal-backdrop">
      <div className="match-wizard">
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="wizard-progress">
          {[1, 2, 3, 4].map((number) => (
            <span
              key={number}
              className={number <= step ? "active" : ""}
            />
          ))}
        </div>

        {step === 1 && (
          <section>
            <span className="eyebrow">KROK 1 Z 4</span>
            <h2>Gdzie gramy?</h2>
            <p>Wybierz klub, w którym chcesz zorganizować mecz.</p>

            <div className="wizard-option-grid">
              <button
                className={form.clubSlug === "all" ? "active" : ""}
                onClick={() => setForm({ ...form, clubSlug: "all" })}
              >
                <strong>Dowolny klub</strong>
                <small>Jestem elastyczny</small>
              </button>

              {clubs.map((club) => (
                <button
                  key={club.slug}
                  className={
                    form.clubSlug === club.slug ? "active" : ""
                  }
                  onClick={() =>
                    setForm({ ...form, clubSlug: club.slug })
                  }
                >
                  <strong>{club.name}</strong>
                  <small>
                    {Object.keys(club.courts || {}).length} kortów
                  </small>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <span className="eyebrow">KROK 2 Z 4</span>
            <h2>Kiedy gramy?</h2>
            <p>Podaj dzień i orientacyjny czas meczu.</p>

            <div className="wizard-form-grid">
              <label className="wizard-wide">
                <span>Data</span>
                <input
                  type="date"
                  min={today()}
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </label>

              <label>
                <span>Od</span>
                <input
                  type="time"
                  value={form.from}
                  onChange={(event) =>
                    setForm({ ...form, from: event.target.value })
                  }
                />
              </label>

              <label>
                <span>Do</span>
                <input
                  type="time"
                  value={form.to}
                  onChange={(event) =>
                    setForm({ ...form, to: event.target.value })
                  }
                />
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <span className="eyebrow">KROK 3 Z 4</span>
            <h2>Jaki mecz?</h2>
            <p>To pomaga dobrać odpowiednich graczy.</p>

            <label className="wizard-select-label">
              <span>Poziom</span>
              <LevelSelect
                value={form.level}
                onChange={(value) =>
                  setForm({ ...form, level: value })
                }
              />
            </label>

            <div className="wizard-game-types">
              {[
                "Rekreacja",
                "Trening",
                "Szybki mecz",
                "Szukamy pary"
              ].map((type) => (
                <button
                  key={type}
                  className={form.gameType === type ? "active" : ""}
                  onClick={() => setForm({ ...form, gameType: type })}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="wizard-note">
              <span>Dodatkowa informacja</span>
              <textarea
                placeholder="Np. spokojna gra, mamy piłki, szukamy jednej osoby..."
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
              />
            </label>
          </section>
        )}

        {step === 4 && (
          <section>
            <span className="eyebrow">KROK 4 Z 4</span>
            <h2>Gotowe do publikacji.</h2>
            <p>Sprawdź szczegóły meczu.</p>

            <div className="wizard-summary">
              <article>
                <span>📍</span>
                <div>
                  <small>Klub</small>
                  <strong>
                    {form.clubSlug === "all"
                      ? "Dowolny klub"
                      : selectedClub?.name}
                  </strong>
                </div>
              </article>

              {form.courtName && (
                <article>
                  <span>🎾</span>
                  <div>
                    <small>Kort</small>
                    <strong>{form.courtName}</strong>
                  </div>
                </article>
              )}

              <article>
                <span>📅</span>
                <div>
                  <small>Data</small>
                  <strong>{form.date}</strong>
                </div>
              </article>

              <article>
                <span>🕒</span>
                <div>
                  <small>Godzina</small>
                  <strong>
                    {form.from}–{form.to}
                  </strong>
                </div>
              </article>

              <article>
                <span>📊</span>
                <div>
                  <small>Poziom</small>
                  <strong>{form.level}</strong>
                </div>
              </article>

              <article>
                <span>🎾</span>
                <div>
                  <small>Rodzaj</small>
                  <strong>{form.gameType}</strong>
                </div>
              </article>

              <article>
                <span>👥</span>
                <div>
                  <small>Skład na start</small>
                  <strong>
                    1/4 — Ty jako organizator
                  </strong>
                </div>
              </article>

              {form.suggestedPlayers?.length > 0 && (
                <article className="wizard-wide">
                  <span>✉️</span>
                  <div>
                    <small>Po publikacji zaprosimy</small>
                    <strong>
                      {form.suggestedPlayers
                        .map((player) => player.nickname)
                        .join(", ")}
                    </strong>
                  </div>
                </article>
              )}
            </div>
          </section>
        )}

        {error && <div className="wizard-error">{error}</div>}

        <div className="wizard-actions">
          {step > 1 ? (
            <button
              className="wizard-back"
              onClick={() => setStep(step - 1)}
            >
              ← Wstecz
            </button>
          ) : (
            <button className="wizard-back" onClick={onClose}>
              Anuluj
            </button>
          )}

          {step < 4 ? (
            <button
              className="wizard-next"
              onClick={() => setStep(step + 1)}
            >
              Dalej →
            </button>
          ) : (
            <button className="wizard-next" onClick={createMatch}>
              Opublikuj mecz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchWizard;
