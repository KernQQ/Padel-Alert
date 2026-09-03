PADLETIC 1.2 — beta social update

Zawartość paczki:
- pełny folder frontend
- pełny folder backend

Najważniejsze zmiany:
1. Zdjęcie profilowe z galerii do 20 MB.
2. Ekran kadrowania w okręgu: przesuwanie + zoom.
3. Automatyczne przycięcie do 512x512 i kompresja przed wysłaniem.
4. Profil gracza 2.0: pory gry (rano/popołudnie/wieczór) i wiele ulubionych klubów.
5. Ogłoszenia „Szukam partnera” pokazują zdjęcie, miasto, stronę i pory gry; główna akcja to „Zagram”.
6. „Utwórz mecz” z wybranego wolnego kortu przenosi klub/kort/datę/godziny do kreatora meczu.
7. Nie zmieniano produkcyjnych przekierowań BO5.
8. Zachowano Android scroll fix jako ostatnią warstwę CSS przed nowym stylem 1.2.

Po podmianie:
cd C:\PROJEKTY\Padel-Alert\frontend
npm run build

Jeżeli build przejdzie:
cd C:\PROJEKTY\Padel-Alert
git add frontend backend
git commit -m "PADLETIC 1.2 profile and partner flow"
git push origin main

Po deployu sprawdź:
- Moje -> Edytuj profil -> zdjęcie z galerii -> kadr -> zapisz profil
- wybór pory gry i kilku ulubionych klubów
- Gracze -> Zagram
- Korty -> Wybierz -> Utwórz mecz -> czy klub/kort/data/godziny są w kreatorze
- Android: przewijanie strony
- BO5: Przejdź do rezerwacji dla 3 klubów
