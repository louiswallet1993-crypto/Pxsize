# État des versions — 27 août 2026

La première release propose **Windows uniquement**. La présence d'une configuration Mac ou Linux ne prouve pas que la version soit prête pour les utilisateurs.

## Contrôles effectués

La [première exécution native](https://github.com/louiswallet1993-crypto/Pxsize/actions/runs/33075129859) porte sur le commit `e57956b47adb482b659cf50c233a19564d8453c3`. Elle utilise une machine propre par système et architecture.

| Plateforme | Constats | Distribution |
| --- | --- | --- |
| Windows x64 | Compilation, lancement de l'application empaquetée, 8 effets dans les deux modes, export PNG et export MP4 relu : réussis. Application non signée. | Première release, avec les limites connues documentées. |
| Mac Intel | Compilation DMG et mêmes tests fonctionnels réussis. FFmpeg Intel réellement exécuté. | Retenue : installation utilisateur et comportement de Gatekeeper non vérifiés. |
| Mac Apple Silicon | Compilation DMG et mêmes tests fonctionnels réussis avec FFmpeg ARM. La capture sur le petit écran du runner montre une palette coupée et un chevauchement du bouton d'export. | Retenue : interface sur petites fenêtres à corriger et installation à valider. |
| Linux x64 | Compilation et tests fonctionnels réussis. La collecte initiale a échoué car AppImage utilise `x86_64` dans son nom, contrairement à l'archive `tar.gz` qui utilise `x64` ; la collecte a été corrigée. | En préparation : installation réelle de l'AppImage et de l'archive à valider. |

L'export testé passe par l'interface et les commandes IPC de l'application. Seul le choix du chemin de sauvegarde est simulé pour éviter une boîte de dialogue système dans les tests. Le test utilise des médias synthétiques, pas les fichiers d'un utilisateur.

## Correction de l'affichage avant publication

La [deuxième exécution native](https://github.com/louiswallet1993-crypto/Pxsize/actions/runs/33076114479), sur le commit `63e58dc42f360db5083f0de5adfdba05d67c4acb`, a réussi les builds et tests fonctionnels sur les quatre cibles. La mesure de la fenêtre Windows du runner (1 008 × 689 pixels) a cependant confirmé que le débordement concernait aussi Windows : ces artefacts ne sont pas ceux à distribuer.

Le panneau des réglages est désormais défilable et s'arrête au-dessus du bouton EXPORT. Le test reproduit aussi une fenêtre de **1 008 × 652 pixels**, vérifie le défilement jusqu'à la palette avec Line Warp, ajoute une couleur, ouvre son sélecteur et la retire. Une superposition ou un contrôle inaccessible fait échouer le test et bloque la publication.

Le fichier `BUILD-INFO.json` joint à la release identifie le commit et les dimensions réellement testés pour l'installateur distribué. Cette correction commune ne vaut pas validation de l'installation Mac ou Linux.

## Ce que les tests ne prouvent pas

- Installation depuis un téléchargement sur un poste vierge, avec SmartScreen ou Gatekeeper actif.
- Fonctionnement sur toutes les versions de Windows, macOS et distributions Linux.
- Affichage correct à toutes les résolutions et à tous les niveaux de zoom du système ; les dimensions testées sont enregistrées dans le manifeste.
- Audit de sécurité, signature numérique ou notarisation Apple.

## Avant de publier Mac

1. Revoir les captures du panneau défilable et vérifier l'accès à toute la palette sur les deux architectures.
2. Télécharger le DMG sur un Mac utilisateur, l'ouvrir, copier l'application dans Applications et la lancer avec les protections normales du système.
3. Tester une image avec transparence et une vidéo, les exports, puis la fermeture et le redémarrage.
4. Décider de la signature et de la notarisation, et documenter les systèmes réellement testés.
5. Ajouter la plateforme à `.github/release-platforms.json` seulement après cette validation, puis reconstruire et publier une nouvelle version.

Les captures des tests sont disponibles dans les artefacts `Test-*` du workflow pendant 14 jours. Le manifeste de la release conserve le SHA, les contrôles et les empreintes des fichiers distribués.
