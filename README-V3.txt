PadelAlert AccountPanel V3

Zmiana:
- kliknięcie w tło modala NIE zamyka już okna logowania/rejestracji,
- usunięto onMouseDown z backdropu,
- usunięto zbędne stopPropagation z sekcji modala,
- zamykanie pozostaje przez przycisk X.

Podmiana:
frontend/src/components/AccountPanel.jsx

Po podmianie:
npm run build
git add frontend/src/components/AccountPanel.jsx
git commit -m "Fix AccountPanel login modal V3"
git push origin main
