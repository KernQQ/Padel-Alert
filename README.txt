HOTFIX: wspólne tło desktop

Poprzednio stary reset CSS miał:
.main-shell::before { content:none; display:none; }

Ten hotfix nadpisuje dokładnie te reguły.

Podmień:
frontend/src/styles/desktop-clean-reset.css

Dodaj/nadpisz:
frontend/public/assets/padletic-bg-desktop-wideview.jpg

Mobile nie jest modyfikowany.
