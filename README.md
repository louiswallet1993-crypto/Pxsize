<h1 align="center">PXSize</h1>

<p align="center">Des images et des vidéos. Des pixels. Votre style.</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/570825fd-7263-43b2-9f2e-c30e66964ac5" controls width="360"></video>
</p>

<p align="center">
  <a href="https://github.com/louiswallet1993-crypto/Pxsize/releases/latest"><strong>Télécharger PXSize</strong></a>
  · <a href="docs/INSTALLATION.md">Aide à l'installation</a>
  · <a href="https://github.com/louiswallet1993-crypto/Pxsize/issues">Signaler un problème</a>
</p>

---

PXSize transforme vos images et vos vidéos en motifs de points, de pixels, de lignes ou de chiffres. Ce procédé s'appelle le **tramage** (*dithering*) : un moyen simple de donner un aspect rétro, imprimé ou graphique à vos créations.

Tout se fait sur votre ordinateur, sans compte. Vos images et vidéos ne sont pas envoyées à un serveur.

## Télécharger

**[Télécharger PXSize pour Windows](https://github.com/louiswallet1993-crypto/Pxsize/releases/download/v2.0.0/PXSize-2.0.0-Windows-Setup.exe)** — Windows 10 ou 11, PC 64 bits Intel / AMD.

**Mac et Linux : en préparation.** Ces versions ne sont pas proposées dans la première release. Les contrôles et points restant à valider sont décrits dans le [suivi des plateformes](docs/PLATFORMS.md).

Pas besoin d'installer Node.js ni de savoir coder. Les fichiers « Source code » proposés par GitHub sont destinés au développement : **ce ne sont pas les applications à installer**.

> PXSize n'a pas encore de signature numérique Windows. Une alerte peut donc apparaître à l'ouverture. Consultez le [guide d'installation](docs/INSTALLATION.md) et ne désactivez pas les protections de votre ordinateur.

## Créer en trois étapes

1. **Ajoutez votre fichier** : glissez une image ou une vidéo dans la fenêtre, ou cliquez dans la zone vide.
2. **Trouvez votre style** : choisissez un effet, ajustez la taille des motifs, puis essayez le noir et blanc ou votre propre palette de couleurs.
3. **Cliquez sur `EXPORT`** : enregistrez votre image en **PNG** ou votre vidéo en **MP4**.

Huit effets sont proposés, avec aperçu interactif, zoom, thème clair ou sombre et conservation de la transparence des images avec l'option `ALPHA`.

## Bon à savoir

- **Images** : JPG, PNG, GIF et WebP. L'export PNG garde les dimensions de l'image d'origine. Un GIF est traité comme une image, pas comme une animation à exporter.
- **Vidéos** : MP4, MOV, AVI et WebM, selon le format vidéo utilisé dans le fichier. Privilégiez un MP4 H.264 si une vidéo ne s'ouvre pas.
- **Export vidéo** : MP4 à 30 images par seconde, **sans le son d'origine**, avec une largeur maximale de 1 100 pixels. Les longues vidéos peuvent demander du temps et de l'espace disque temporaire.
- Les boutons de l'application sont en anglais : `SIZE` règle la taille du motif et `EXPORT` enregistre le résultat.
- L'interface demande de la hauteur : une petite fenêtre peut masquer le bas de la palette. Agrandissez la fenêtre ; une amélioration de l'affichage sur petits écrans reste à faire.

## Un souci ou une idée ?

[Ouvrez un ticket](https://github.com/louiswallet1993-crypto/Pxsize/issues) en indiquant votre système, votre version de PXSize et ce qui s'est passé. Une capture d'écran aide beaucoup ; évitez de joindre des fichiers privés.

Créé par **Rastro** · [@rastrolastronot](https://www.instagram.com/rastrolastronot/)

<details>
<summary>Pour les personnes qui souhaitent travailler sur le code</summary>

Voir le [guide de développement](docs/DEVELOPMENT.md), le [guide de publication](docs/RELEASING.md) et les [crédits des composants](THIRD_PARTY_NOTICES.md).

</details>
