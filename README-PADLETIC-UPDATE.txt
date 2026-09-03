PADLETIC — aktualizacja widget UI + PWA + profil + admin

Paczka zawiera PEŁNE foldery:
- frontend
- backend

Najbezpieczniej:
1. Zrób kopię obecnych folderów frontend i backend.
2. Podmień całe foldery w C:\PROJEKTY\Padel-Alert.
3. Frontend — sprawdź build:
   cd C:\PROJEKTY\Padel-Alert\frontend
   npm run build
4. Backend — sprawdź start/syntax według obecnego workflow. Backend nie ma osobnego buildu.
5. Dopiero po udanym teście:
   cd C:\PROJEKTY\Padel-Alert
   git add frontend backend
   git commit -m "Update widget UI PWA profile and admin users"
   git push origin main

Co zmieniono:
- widgetowy, ciemno-zielony wygląd strony (szczególnie desktop)
- zatwierdzony znak PADLETIC jako ikona / favicon / PWA
- czysty avatar w prawym górnym rogu, bez podwójnej obwódki
- kliknięcie avatara otwiera menu konta
- poziom gracza prezentowany jako sama liczba
- instalacja PWA: wczesne przechwytywanie beforeinstallprompt
- cała karta „Zainstaluj PADLETIC” w Moje jest klikalna
- instrukcja instalacji jest renderowana nad całą aplikacją i nie ginie pod kafelkami
- poprawiona instalacja / instrukcja dla desktop, Android Chrome i iOS Safari
- zdjęcie profilowe jest zmniejszane po stronie przeglądarki i zapisywane w profilu na backendzie
- admin może usuwać użytkowników; endpoint usuwa też powiązane dane konta
- administrator nie może usunąć własnego konta ani konta chronionego przez ADMIN_EMAILS

NIE ZMIENIANO:
- publicznych linków BO5
- logiki działającej pływającej chmurki wyboru kortu
- istniejących kluczy localStorage / tabeli padelalert_state
