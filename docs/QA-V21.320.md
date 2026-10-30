# QA V21.320 – Footera-Logo im Wiederholungs-Übergang

- Der rote Übergang mit „F“ vor und nach der Torwiederholung ist ersetzt: rote Spur, Chromkante und dunkle Bahn wischen schräg durchs Bild, in der Mitte erscheint das Footera-Wappen mit „FOOTERA“ und „WIEDERHOLUNG“.
- Timing unverändert (0,64 s, Bild bei 0,32 s komplett verdeckt, genau dann schneidet die Wiederholungskamera).
- Wappen kommt aus `assets/footera/emblem.png` (schon im Service-Worker-Cache, offline verfügbar).
- Geprüft: Standard-Regression grün, Einzelbilder des Übergangs im Chromium-Browser gerendert (360-412 px Breite ändern nur die Logogröße über clamp()).
