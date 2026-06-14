# Nexus Translator

Traducteur web **gratuit, illimité et sans clé API**. Application monopage
(PWA) installable, fonctionnant directement dans le navigateur — aucune
installation ni compte requis.

➡️ Ouvrez simplement `index.html` (ou hébergez le dossier sur n'importe quel
serveur statique : GitHub Pages, Netlify, Vercel…).

## Fonctionnalités

- **109 langues** prises en charge (de l'afrikaans au zoulou).
- **Détection automatique** de la langue source.
- **Traduction en temps réel** (au fil de la frappe, avec anti-rebond).
- **Deux moteurs avec repli automatique** :
  - [MyMemory](https://mymemory.translated.net/) — moteur principal ;
  - [LibreTranslate](https://libretranslate.com/) — repli sur instances publiques.
- **Variantes de traduction** cliquables (issues des correspondances réelles de MyMemory).
- **Registre tu/vous** (formel/familier) pour 23 langues, via post-traitement
  des pronoms d'adresse (français, espagnol, allemand, russe, etc.).
- **Phonétique** : translittération latine pour les écritures cyrillique,
  grecque, arabe, hébraïque et japonaise (kana).
- **Synthèse vocale** (text-to-speech) avec sélection automatique de la voix.
- **Historique** (100 dernières traductions) et **favoris**, persistés localement.
- **Mode hors-ligne** : l'application et les traductions déjà faites restent
  accessibles sans réseau (Service Worker + cache local).
- **Copier / coller / inverser les langues** en un clic.
- Interface sombre responsive (mobile & bureau), respect de
  `prefers-reduced-motion`.

## Structure du projet

| Fichier         | Rôle                                                        |
| --------------- | ----------------------------------------------------------- |
| `index.html`    | Structure de la page et des trois vues.                     |
| `style.css`     | Thème et mise en page.                                       |
| `app.js`        | Logique : traduction, registre, TTS, historique, favoris…   |
| `languages.js`  | Référentiel des langues (codes, libellés, TTS, registre).   |
| `sw.js`         | Service Worker (cache de l'application pour le hors-ligne).  |
| `manifest.json` | Manifeste PWA (installation sur l'écran d'accueil).         |
| `icon.svg`      | Icône de l'application.                                      |

## Utilisation locale

Aucune dépendance, aucune compilation. Pour le Service Worker (mode
hors-ligne), servez le dossier via HTTP plutôt qu'en `file://` :

```bash
# avec Python
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Limites (honnêteté)

- Les API gratuites publiques imposent des quotas et peuvent être
  momentanément indisponibles — d'où le double moteur et le cache.
- Le registre tu/vous et la phonétique sont des aides **approximatives**
  (post-traitement par règles), pas une garantie grammaticale.
- Pour un usage professionnel, vérifiez toujours le résultat.
