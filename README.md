# VocaFlow V12.6 – Cache- und Bedienungsfix

Diese Version behebt gezielt die drei gemeldeten Fehler:

1. Graue Mathe-Kacheln
- falsche Farbklassen korrigiert
- Safari-Buttondarstellung explizit überschrieben

2. Auswendig lernen / Abenteuer reagiert nicht
- math.js robuster gemacht
- alte nicht mehr vorhandene Tabellenfläche verursacht keinen JavaScript-Abbruch mehr
- Bosskampf bleibt als Kachelauswahl ohne Browser-Prompt

3. Reihen / Lücken blenden nicht aus
- Countdown komplett neu geschrieben
- zählt wirklich 7 → 1
- danach werden beide oberen Zahlenübersichten vollständig versteckt
- erst danach erscheint die Gedächtnis-Lückenaufgabe
- beim Aufsagen beginnt die Spracherkennung erst nach dem Ausblenden

Wichtig:
Der bisherige Service Worker wurde in V12.6 bewusst deaktiviert und der Browser-Cache beim ersten Start einmal gelöscht, damit nicht mehr alte HTML-, CSS- und JS-Versionen gemischt werden.

Unten rechts steht klein „V12.6“. Daran ist sofort erkennbar, ob die richtige Version geladen wurde.
