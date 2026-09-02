PADLETIC FRONTEND UPDATE

W tej paczce:
- nowa ikona PADLETIC (zatwierdzony znak P) dla PWA / iOS / Android / favicon
- ciemny splash/theme PWA
- instalacja aplikacji dostępna także z sekcji Moje na telefonie
- instrukcja instalacji dla Safari i Chrome
- poprawiony avatar w prawym górnym rogu
- oznaczenie poziomu w Matchmaker: sama liczba, bez ikonki wykresu
- możliwość wybrania zdjęcia profilowego (lokalnie na urządzeniu)
- zachowane działające poprawki wyboru kortu i pływającej chmurki

UWAGA: usuwanie kont użytkowników przez admina wymaga endpointu DELETE po stronie backendu.
Nie dodano martwego przycisku, który tylko udawałby działanie.

Po podmianie folderu frontend:
cd C:\PROJEKTY\Padel-Alert\frontend
npm run build

Jeżeli build przejdzie:
cd ..
git add frontend
git commit -m "Update PADLETIC profile and PWA UI"
git push origin main
