PADELALERT — RELEASE CANDIDATE 1

Cel: zamrożenie wyglądu przed publiczną betą.

Zmiany:
- jeden IDENTYCZNY layout dla trybu jasnego i ciemnego,
- motywy różnią się tylko kolorami / powierzchniami / obramowaniami,
- krótsze hero,
- mniej pustej przestrzeni,
- osobny pasek "Najbliższe wolne",
- usunięcie dublującej prawej kolumny ze Startu,
- 3 pełnowymiarowe, kompaktowe karty klubów,
- realne godziny na kartach, jeśli są w recommendations,
- dopracowany mobile,
- Service Worker cache zmieniony na rc1, aby ograniczyć stare UI po deployu.

NIE ZMIENIA:
- backendu,
- BO5/API,
- logowania,
- admina,
- meczów,
- poziomów graczy,
- zasady poziomu co 0.1.

INSTALACJA:
1. Rozpakuj ZIP do C:\PROJEKTY\Padel-Alert i nadpisz pliki.
2. PowerShell:
   .\TEST-RELEASE-CANDIDATE-1.bat
3. Gdy [OK]:
   .\DEPLOY-RELEASE-CANDIDATE-1.bat
4. Poczekaj na Render.
5. Sprawdź desktop DARK/LIGHT i telefon.
