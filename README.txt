PADLETIC — desktop content flow fix

Podmień:
frontend/src/styles/desktop-clean-reset.css

Co naprawia:
- usuwa desktopową warstwę ::before, która powodowała problem z układem,
- tło jest teraz malowane bezpośrednio na .main-shell i nie zajmuje miejsca w layoucie,
- zawartość Start zaczyna się od góry,
- MOBILE <= 900 px NIE JEST RUSZANY.

Uwaga:
Próba lokalnego builda w środowisku roboczym nie zakończyła się, ponieważ npm ci nie zdążył pobrać zależności w limicie czasu. Nie zgłaszam więc fałszywie, że build został zweryfikowany.
