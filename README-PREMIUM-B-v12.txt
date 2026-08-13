PADELALERT PREMIUM B v12 — DROP-IN

Baza: stabilna v7.
Backend / BO5 / API nie zostały zmienione.

Co zmieniono:
- nowy ekran Start Premium B,
- desktop: hero + kompaktowa wyszukiwarka + zdjęcia klubów + prawa kolumna,
- mobile: krótszy hero, kompaktowe filtry i listowe karty klubów,
- domyślnie spójny ciemny motyw,
- prawdziwe dane z istniejącego HomeDashboard są używane w kartach i godzinach,
- kliknięcie terminu nadal przekazuje istniejący obiekt do ekranu Korty.

Instalacja:
1. Zrób kopię obecnego folderu C:\PROJEKTY\Padel-Alert.
2. Rozpakuj tę paczkę do C:\PROJEKTY\Padel-Alert i nadpisz pliki.
3. NIE usuwaj backend\.env.
4. Uruchom TEST-PREMIUM-B-v12.bat.
5. Dopiero gdy build przejdzie, uruchom DEPLOY-PREMIUM-B-v12.bat.

TEST nie robi push.
DEPLOY robi commit + push dopiero po poprawnym buildzie.
