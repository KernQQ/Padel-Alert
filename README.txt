PADLETIC REBRAND

Zmienia wyłącznie branding frontendu:
- PadelAlert -> PADLETIC w widocznych tekstach
- znak PA -> P w istniejącym layoucie
- nazwa PWA / manifest
- tytuł i opis strony
- favicon + ikony PWA w obecnej zielonej stylistyce

NIE zmienia:
- BO5
- API / endpointów
- logiki meczów, czatu, powiadomień
- localStorage keys (celowo zostają padelalert-* dla kompatybilności)
- eventów realtime i bazy danych

Uruchom APPLY-PADLETIC-REBRAND.bat.
Skrypt robi backup i automatyczny rollback, jeśli lokalny npm run build nie przejdzie.
