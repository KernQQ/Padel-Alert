PADLETIC — DESKTOP FLOW RESTORE

Podmień tylko:
frontend/src/styles/desktop-clean-reset.css

Naprawa:
- desktopowy Start wraca do pierwszego viewportu,
- tło nie tworzy osobnej warstwy zajmującej wysokość,
- wyłączone zostały pseudo-warstwy ::before/::after odpowiedzialne za konflikt,
- tło jest malowane bezpośrednio na .main-shell,
- układ desktopu pozostaje jak wcześniej: nagłówek -> hero -> korty -> mecze,
- mobile <=900px nie jest objęty żadną z nowych reguł.

Build:
Kod CSS został przygotowany na aktualnym Padel-Alert(8).
Lokalny Vite nie mógł wystartować z powodu brakującego natywnego bindingu Rolldown
w dostarczonym node_modules; nie jest to błąd składni CSS ani aplikacji.
