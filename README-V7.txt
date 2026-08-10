PADELALERT v7 — UI / UX POLISH

Ta paczka zbiera wszystkie ostatnie uwagi wizualne z desktopu i iPhone.

ZMIANY:
- LIVE usunięte z UI,
- konto występuje tylko raz: avatar + nick + dropdown,
- mail nie zajmuje miejsca w topbarze,
- powiadomienia jako normalna ikona dzwonka,
- instalacja PWA usunięta z mobilnego topbara,
- brak pływającego + na Kortach/Starcie,
- dolna nawigacja mobile ma ikony, safe-area i nie zasłania treści,
- wyniki Kortów na telefonie są kartami zamiast desktopowej tabeli,
- pasek akcji Kortów poprawiony,
- topbar mobile uproszczony,
- Start na telefonie bardziej zwarty,
- subtelne linie kortu jako tło/charakter marki,
- dark mode uspokojony: grafit + zgaszona zieleń, bez limonkowego neonu,
- dark/light mają ten sam layout,
- desktopowy sidebar dostał spójne ikony SVG,
- duplikat profilu w sidebarze ukryty.

WDROŻENIE:
Rozpakuj całą paczkę do:
C:\PROJEKTY\Padel-Alert

Nie usuwaj backend\.env.

Uruchom:
APPLY-V7.bat

Po deployu na iPhone zrób pełne odświeżenie / zamknij kartę i otwórz ponownie,
bo PWA/Service Worker może chwilę trzymać stary CSS.
