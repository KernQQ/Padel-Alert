PADELALERT v5 — CONSUMER SPORTS UI

To jest PEŁNY snapshot projektu oparty na działającej wersji v4.
Nie podmieniaj pojedynczych plików.

KIERUNEK
- UX inspirowany dojrzałymi aplikacjami do rezerwacji kortów,
- nie kopiujemy Playtomic 1:1,
- koniec z wyglądem dashboardu / generatora AI,
- realne terminy i akcje są ważniejsze niż dekoracyjne karty.

NAJWIĘKSZE ZMIANY
1. Start:
   - "Graj w padla"
   - dwa główne CTA: kort i mecz
   - najbliższe terminy jako lista
   - kluby i gracze jako realna treść
2. Wolne korty:
   - kompaktowy nagłówek
   - Dzisiaj/Jutro/kolejne dni
   - zwarty filtr
   - wyniki jako lista godzin + klubów/kortów
   - sensowny pusty stan
   - prosty sticky booking sheet
3. Sidebar:
   - biały/grafitowy, prosty
   - bez numerów 01/02/03
   - bez gradientów i neonów
4. Dark mode:
   - ten sam produkt, tylko inna paleta
5. Pozostałe ekrany:
   - uspokojone wizualnie, bez wielkich dashboardowych kart

WDROŻENIE
Rozpakuj CAŁĄ paczkę do:
C:\PROJEKTY\Padel-Alert
i zaakceptuj nadpisanie.

Paczka nie zawiera backend/.env.

Potem:
cd C:\PROJEKTY\Padel-Alert\frontend
npm run build

Jeśli build OK:
cd C:\PROJEKTY\Padel-Alert
git add .
git commit -m "PadelAlert v5 consumer sports UI"
git push origin main
