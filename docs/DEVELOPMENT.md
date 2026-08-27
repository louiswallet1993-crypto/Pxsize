# Développer PXSize

L'application utilise Electron, HTML, CSS et JavaScript. Le traitement graphique se fait localement dans un Web Worker ; FFmpeg assure l'encodage vidéo.

## Démarrage

Avec **Node.js 22** et Git :

```sh
git clone https://github.com/louiswallet1993-crypto/Pxsize.git
cd Pxsize
npm ci
npm start
```

`npm ci` utilise les versions exactes de `package-lock.json`. Le premier téléchargement d'Electron et de FFmpeg nécessite une connexion Internet.

## Vérification et compilation

```sh
npm run check
npm run smoke
```

Le smoke test ouvre une instance isolée de l'application, vérifie les rendus et les exports, puis la ferme. Les fichiers et captures de test vont dans `output/`, qui n'est pas versionné. Le sélecteur de sauvegarde natif est remplacé uniquement dans cette instance de test.

| Système de la machine | Commande |
| --- | --- |
| Windows Intel / AMD | `npm run build-win` |
| Mac Apple Silicon | `npm run build-mac -- --arm64` |
| Mac Intel | `npm run build-mac -- --x64` |
| Linux Intel / AMD | `npm run build-linux` |

Les livrables arrivent dans `dist/`. Les commandes désactivent la publication automatique.

**Compilez sur le système et l'architecture cibles.** Le paquet `ffmpeg-static` télécharge un exécutable propre à la machine lors de `npm ci`. Réutiliser un `node_modules` Windows sur Mac, ou Intel sur ARM, produit une application incorrecte. Le workflow GitHub utilise donc quatre machines distinctes.

## Repères

- `main.js` : fenêtre Electron, accès disque, encodage vidéo.
- `src/` : moteur graphique, rendu, export et interface.
- `styles/` et `ASSETS/` : styles, images et polices nécessaires.
- `build/` : icônes de l'application, à conserver dans Git.
- `scripts/` : contrôles du code, test de l'application et préparation des téléchargements.
- `.github/workflows/build.yml` : fabrication et vérification sur chaque système.

Les dépendances, compilations, secrets, notes de travail privées et maquettes de référence sont exclus de Git. Les binaires se distribuent dans les releases, pas dans l'historique du code.

## Avant une évolution importante

Cette initialisation conserve la base Electron 28 du projet fourni ; elle ne constitue pas un audit de sécurité. La mise à niveau d'Electron, l'isolation du renderer et la signature des applications doivent faire l'objet d'un chantier dédié avec tests de non-régression.

La licence du code et des créations PXSize reste à préciser par leur titulaire. Aucune licence libre n'est attribuée par défaut à l'application. Les composants tiers conservent leurs propres licences : voir [les crédits](../THIRD_PARTY_NOTICES.md).
