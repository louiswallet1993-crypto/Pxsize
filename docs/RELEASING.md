# Publier une version

Une release est la page sur laquelle les utilisateurs téléchargent l'application. Elle doit contenir les installateurs, une courte explication et les limites connues.

## 1. Préparer

1. Valider les plateformes annoncées. `.github/release-platforms.json` autorise actuellement **Windows x64 uniquement** ; ne pas y ajouter Mac ou Linux sans recette préalable.
2. Mettre à jour la version de `package.json` et de `package-lock.json` ensemble, par exemple avec `npm version patch --no-git-tag-version`.
3. Mettre à jour les liens de téléchargement du README et écrire `docs/releases/vX.Y.Z.md` en prenant la version précédente comme modèle.
4. Exécuter `npm run check` et `npm run smoke`, puis committer avec l'identité Git du mainteneur.
5. Pousser le code sur `main`, sans forcer ni écraser des changements distants.

## 2. Fabriquer et tester

Depuis l'onglet **Actions**, lancer manuellement **Construire les applications** sur le commit à publier. Avec GitHub CLI :

```sh
gh workflow run build.yml --ref main
```

Le workflow produit Windows, Mac Intel, Mac Apple Silicon et Linux sur quatre machines distinctes. Chaque machine vérifie l'application empaquetée et ses exports avant de proposer les fichiers. Les résultats restent disponibles 14 jours dans les artefacts du workflow.

**Ne pas créer de release tant que les vérifications des plateformes annoncées ne sont pas terminées.** Un build réussi seul n'est pas une preuve d'installation ni d'export fonctionnel. Les tests automatisés ne remplacent pas une recette manuelle, en particulier pour Gatekeeper sur Mac.

Le lancement du workflow ne crée aucun tag ni aucune release. La publication est faite par un mainteneur connecté à GitHub, jamais par un compte bot.

## 3. Rassembler les fichiers

Vérifier le compte GitHub actif et le SHA du workflow, puis récupérer uniquement les artefacts des plateformes autorisées. Pour la première release :

```sh
gh api user --jq .login
gh run download RUN_ID --repo louiswallet1993-crypto/Pxsize --pattern "PXSize-Windows" --dir release/downloads
node scripts/prepare-release.cjs --collect release/downloads release/publish
```

Le script refuse une plateforme non autorisée, un ensemble incomplet, une fenêtre de test trop petite pour la palette, des fichiers inattendus, des doublons, un SHA incohérent ou une empreinte incorrecte. Le checkout doit être sur le commit exact testé. Le dossier de sortie doit être vide. Ne pas réutiliser les artefacts d'une autre exécution.

## 4. Publier

Créer un tag sur le commit testé, puis un brouillon :

```sh
git tag -a vX.Y.Z -m "PXSize X.Y.Z"
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --draft --title "PXSize X.Y.Z — À vous de créer" --notes-file docs/releases/vX.Y.Z.md
```

Joindre tous les fichiers de `release/publish/` au brouillon depuis GitHub ou avec `gh release upload`. Vérifier leurs noms, leurs tailles, leurs empreintes et les liens du texte. Publier le brouillon une fois l'ensemble complet, puis vérifier les téléchargements publics et le lien **Latest**. Ne jamais déplacer un tag déjà publié.

## Texte pour les utilisateurs

Commencer par « Quel fichier choisir ? », puis décrire les nouveautés en phrases courtes. Expliquer le choix Apple Silicon / Intel. Signaler l'absence de signature, les limites vidéo et ce qui n'a pas été testé manuellement. Ne pas utiliser une liste de commits comme unique description.

Ne pas joindre `node_modules`, les dossiers décompressés, les `.blockmap`, les logs ou les fichiers de test. Les archives « Source code » sont ajoutées automatiquement par GitHub ; préciser qu'elles ne sont pas les applications.
