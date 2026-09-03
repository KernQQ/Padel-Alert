PADLETIC — FULL UPDATE

W paczce są kompletne foldery frontend/ i backend/.

Zmiany:
- wymagane konto: aplikacja nie działa już w trybie Gość,
- sesja 180 dni + przesuwanie ważności sesji; chwilowy błąd sieci nie wylogowuje,
- główne wyszukiwanie domyślnie 08:00–23:59,
- ograniczony wybór czasu: od 06:00, co 30 min, koniec dnia pokazany jako 00:00 (wewnętrznie 23:59),
- realni Gracze online: tylko zalogowani z heartbeat z ostatnich 3 minut; usunięto profile demo,
- wejście w Mecze nie otwiera ponownie kreatora; kreator otwiera się po świadomym Utwórz mecz / z wybranego kortu,
- nocne tło padelowe w trybie ciemnym,
- mały ciemny i czytelny X na chmurce wyboru kortu,
- Web Push: service worker, subskrypcje i wysyłka push z powiadomień community/matches.

WAŻNE — PUSH (jednorazowo):
1. W backend uruchom npm install.
2. Uruchom: node scripts/generate-vapid-keys.js
3. Skopiuj 3 linie do Render -> Backend -> Environment:
   VAPID_PUBLIC_KEY
   VAPID_PRIVATE_KEY
   VAPID_SUBJECT
4. Redeploy backendu.
5. W PADLETIC na telefonie kliknij „Włącz powiadomienia systemowe” i zaakceptuj zgodę.

Na iOS Web Push działa dla PWA dodanej do ekranu początkowego i po udzieleniu zgody.

Nie zmieniano adresów BO5.
