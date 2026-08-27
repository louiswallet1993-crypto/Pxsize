# Composants et crédits

PXSize est une création de Rastro. Cette page recense les composants tiers ; elle n'attribue pas de licence au code ou aux créations propres à PXSize.

| Composant | Utilisation | Licence / source |
| --- | --- | --- |
| [Electron](https://github.com/electron/electron) | Application de bureau | MIT, avec les notices de Chromium et des autres composants dans la distribution Electron |
| [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) | Commandes d'encodage | MIT |
| [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) | Distribution de l'exécutable FFmpeg | GPL-3.0-or-later |
| [FFmpeg](https://ffmpeg.org/) | Encodage des vidéos | Licence propre à chaque binaire ; fichier LICENSE et provenance joints au binaire |
| [Tektur](https://github.com/google/fonts/tree/main/ofl/tektur) | Typographie | SIL Open Font License 1.1, reproduite dans `ASSETS/FONTS/TEKTUR/OFL.txt` |
| [Trade Winds](https://github.com/google/fonts/tree/main/ofl/tradewinds) | Typographie | SIL Open Font License 1.1, reproduite dans `ASSETS/FONTS/TRADE WINDS/OFL.txt` |

## FFmpeg

La version verrouillée de `ffmpeg-static` utilise la [distribution b6.1.1](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1). Ses exécutables et leurs notices diffèrent selon le système. Les fichiers `ffmpeg[.exe].LICENSE` et `ffmpeg[.exe].README` sont conservés à côté de l'exécutable dans `resources/app.asar.unpacked/node_modules/ffmpeg-static/` (sur Mac : `PXSize.app/Contents/Resources/…`). La fabrication échoue si ces notices manquent.

Les notices indiquent la version exacte, les options de compilation et la provenance des sources. Les fournisseurs référencés par ffmpeg-static sont [Gyan pour Windows](https://www.gyan.dev/ffmpeg/builds/), [John Van Sickle pour Linux](https://johnvansickle.com/ffmpeg/), [Evermeet pour Mac Intel](https://evermeet.cx/ffmpeg/) et [OSX Experts pour Mac Apple Silicon](https://osxexperts.net/).

Avant de modifier ou redistribuer ces composants, consulter leurs licences et les [informations de licence FFmpeg](https://ffmpeg.org/legal.html). Ne pas retirer les notices tierces des installateurs.
