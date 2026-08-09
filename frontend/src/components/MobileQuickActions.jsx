function MobileQuickActions({
  open,
  onClose,
  onCreateMatch,
  onFindCourt,
  onPlayNow
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="mobile-actions-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="mobile-actions-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet-handle" />

        <div className="mobile-sheet-heading">
          <div>
            <span className="section-kicker">SZYBKA AKCJA</span>
            <h3>Co chcesz zrobić?</h3>
          </div>

          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="mobile-action-grid">
          <button type="button" onClick={onCreateMatch}>
            <span>🎾</span>
            <div>
              <strong>Utwórz mecz</strong>
              <small>Zbierz skład 1/4 → 4/4</small>
            </div>
            <b>→</b>
          </button>

          <button type="button" onClick={onPlayNow}>
            <span>⚡</span>
            <div>
              <strong>Gram teraz</strong>
              <small>Pokaż innym, że jesteś dostępny</small>
            </div>
            <b>→</b>
          </button>

          <button type="button" onClick={onFindCourt}>
            <span>◫</span>
            <div>
              <strong>Znajdź kort</strong>
              <small>Przejdź do dostępności BO5</small>
            </div>
            <b>→</b>
          </button>
        </div>
      </section>
    </div>
  );
}

export default MobileQuickActions;
