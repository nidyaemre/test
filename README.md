# Bastide Aurane — site vitrine

Site 100 % statique (HTML, CSS, JavaScript) pour la Bastide Aurane, maison d'hôtes
de cinq suites à Gordes (établissement fictif, projet de démonstration).

Tout le visuel du site a été généré : les images avec Nano Banana Pro, les vidéos
avec Seedance 2.5, via le connecteur Higgsfield.

## Structure

```
site/                    ← le site, à déployer tel quel (Netlify, Vercel, S3, nginx…)
  index.html
  css/fonts.css          ← polices auto-hébergées (Cormorant Garamond, Instrument Sans)
  css/styles.css
  js/main.js             ← scrub vidéo au scroll, en-tête, révélations, formulaire
  assets/img/            ← images WebP (plusieurs tailles) + og-image.jpg
  assets/video/          ← arrivee.mp4 (hero), cafe.mp4 et piscine.mp4 (ambiances)
  assets/fonts/          ← fichiers .woff2
tools/                   ← pipeline de récupération / optimisation des médias
.github/workflows/       ← workflow GitHub Actions qui rapatrie les médias générés
```

## L'arrivée au scroll (hero)

Sur ordinateur (pointeur fin, largeur ≥ 900 px, sans `prefers-reduced-motion`),
la section hero mesure 540 vh : la vidéo `arrivee.mp4` est chargée en mémoire puis
sa position de lecture suit le défilement, avec une interpolation douce. La vidéo
est encodée avec une image-clé toutes les 6 images (`-g 6 -bf 0`) pour que chaque
saut soit instantané. Sur mobile et tablette, la même vidéo est lue en boucle
automatiquement dans un hero de 100 svh.

## Régénérer / mettre à jour les médias

Les médias générés sont téléchargés par le workflow `Fetch generated assets`
à partir de `tools/assets-manifest.txt` (une ligne par fichier : destination + URL),
puis optimisés par `tools/build-images.py`. Le workflow se déclenche à chaque
modification du manifeste et committe le résultat dans `site/assets/`.

## Formulaire

Le site étant statique, le formulaire ouvre le logiciel de courrier du visiteur
avec un message pré-rempli (`mailto:`). Pour brancher un service de formulaires
(Netlify Forms, Formspree, Basin…), remplacer le bloc `setupForm` de `js/main.js`
et l'attribut `action` du formulaire.

## Poids

Le site complet pèse moins de 25 Mo et aucun fichier ne dépasse 8 Mo
(voir `tools/check-weight.sh`).
