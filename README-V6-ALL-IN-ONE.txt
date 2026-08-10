PADELALERT v6 — ALL-IN-ONE ULTIMATE BETA

To jest jedna duża paczka do testowania zamiast kolejnych v6.1, v6.2 itd.

W PACZCE JEST JUŻ:
- frontend v5 w stylu dojrzałej aplikacji sportowej,
- Start i Wolne korty,
- logowanie / rejestracja / sesje,
- profile użytkowników,
- PostgreSQL,
- Mecze:
  tworzenie, edycja, dołączanie, opuszczanie, 3/4, 4/4,
  lista oczekujących, gotowość, anulowanie, usuwanie graczy,
  zaproszenia, kalendarz i udostępnianie,
- Gracze:
  profile, poziom, preferowana strona, dyspozycyjność,
  kontakt i zgłoszenia,
- Moje:
  profil, powiadomienia, zaproszenia, moje mecze,
  historia meczów, zgłoszenia, alerty i zapisane wyszukiwania,
- Realtime,
- PWA,
- light/dark,
- BO5 w obecnym stabilnym zakresie.

NOWE W v6:
- alerty reagują na znalezione sloty podczas automatycznego odświeżania,
- przeglądarkowe powiadomienie, jeśli użytkownik wyrazi zgodę,
- zapisane wyszukiwania można otworzyć jednym kliknięciem,
- sekcja Moje uporządkowana,
- historia meczów oddzielona od nadchodzących,
- mniej emoji / mniej języka "Smart/AI",
- dopracowany wspólny wygląd Meczów, Graczy i Moje,
- subtelny motyw linii kortu zamiast AI-gradientów,
- /meta w API pokazuje wersję i aktywne moduły.

CZEGO CELOWO NIE ROBIMY HACKIEM:
- automatycznego kliknięcia konkretnego slotu BO5,
- automatycznej finalizacji rezerwacji w BO5,
- płatności wewnątrz PadelAlert.
To wymaga oficjalnej integracji BO5 lub osobnego systemu płatności.

WDROŻENIE:
1. Rozpakuj CAŁĄ paczkę do:
   C:\PROJEKTY\Padel-Alert
2. Nie usuwaj backend\.env.
3. Uruchom:
   APPLY-V6.bat

TESTUJ:
- Start
- Korty
- konto/rejestracja/logowanie
- profil
- utwórz mecz
- dołącz z drugiego konta
- lista oczekujących
- zaproszenia
- gotowość
- anulowanie
- Gracze / dyspozycyjność
- alert + automatyczne odświeżanie
- zapisane wyszukiwanie
- Moje / historia
- telefon
- jasny i ciemny

Po testach zbieramy CAŁĄ listę błędów i robimy dopiero jeden kolejny zbiorczy release.
