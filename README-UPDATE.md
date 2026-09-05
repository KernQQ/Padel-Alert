# PADLETIC — zbiorcza aktualizacja 2026-09-05

Paczka zawiera wyłącznie pliki do podmiany w istniejącym projekcie.

Zmiany:
- automatyczne archiwum zakończonych meczów i zgłoszeń graczy (Europe/Warsaw),
- naprawione szybkie akcje wyszukiwania kortów,
- naprawione klikanie godzin w desktopowym pickerze,
- zdjęcie profilowe: wybór JPG/PNG/WEBP, okrągły kadr, przesuwanie, zoom i kompresja do maks. ok. 2 MB,
- Start: pola Lokalizacja/Data/Godzina/Czas gry nie teleportują już do Kortów; najpierw wybór, dopiero „Szukaj kortów” otwiera wyniki,
- mobilne „Najbliższe wolne”: poziomy swipe klubów ze snapowaniem,
- ujednolicenie kolorów/kart/obramowań pozostałych sekcji do stylistyki Start,
- nowe ikony PADLETIC dla PWA/Android/iOS oraz manifest.

Po podmianie folderów:
cd C:\PROJEKTY\Padel-Alert
git add .
git commit -m "Padletic batch update"
git push

Po zmianie ikony PWA na telefonie może być potrzebne usunięcie starego skrótu z ekranu głównego i ponowne dodanie aplikacji, ponieważ iOS/Android cache'ują ikonę.
