# Transcription « Recondita armonia » (Puccini, Tosca) — guide pour Le partiteur

Source : /home/claude/partiteur/scan/p-1.png, p-2.png, p-3.png (220 dpi, 1819×2573). Réduction chant-piano (Ricordi). Domaine public.
Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire ; chaque doute → champ "doubt".

## Méthode
- Découpe les systèmes en crops lisibles avec PIL (ex. largeur ~900 px, hauteur d'un système) et lis-les avec l'outil Read (images). Zoome (crop plus petit, puis resize ×2) sur les passages denses : accords, trémolos, arpèges, altérations, notes supplémentaires (lignes additionnelles).
- Armure : 1 bémol (si♭) partout sauf indication. Écris les altérations EFFECTIVES (Bb4, C#5, F#4…), en tenant compte de l'armure et des altérations accidentelles valables jusqu'à la barre de mesure.
- Attention aux CHANGEMENTS DE CLÉ dans la portée inférieure du piano (elle commence en clé de SOL à la p. 1 !) et dans la portée supérieure.
- Le chant (CANTO) est écrit en clé de sol (ténor) : note la hauteur ÉCRITE (l'appli transpose l'octave).

## Format de sortie : un fichier JSON par page, /home/claude/partiteur/data/pN.json
{"page":N,"measures":[
 {"meter":"3/4",                     // seulement si la mesure change OU 1re mesure de la page
  "tempo":"Andante lento","bpm":48,  // si un texte de tempo est imprimé à cette mesure (bpm seulement si imprimé)
  "marks":["p","dolciss.","rall.","a tempo","col canto","Più lento","Sostenendo","allarg.","rit.","Lo stesso movimento","I. Tempo"], // textes/nuances imprimés à cette mesure (chant ou piano)
  "v":"rq rq re C5e",                // ligne de chant (vide "" si pas de chant sur ce système → mettre "rhd" ou les silences imprimés)
  "ly":"Re-",                        // syllabes, une par note chantée (pas pour les silences ni les notes liées ~) ; trait d'union final = syllabe coupée ; "_" = mélisme (note qui prolonge la syllabe précédente)
  "rh":"…", "lh":"…",                // piano main droite / main gauche (portée du haut / du bas)
  "doubt":"…"                        // optionnel
 }, …]}

## Jetons
- note = lettre + altération + octave (C4 = do du milieu) : C4, Bb4, F#5, Eb3. Accord : C4+E4+G4 (durée sur le DERNIER élément ou sur chacun identique, ex. "C4+E4+G4e").
- durée en suffixe (en noires) : w=4, h=2, (rien)=1 noire, e=0.5, s=0.25, t=0.125 (triple croche) ; point : "d" après (hd, qd? → écrire "d" pour noire pointée, ed, sd) ; double point "dd".
- triolet : suffixe "3" après la durée (e3 = croche de triolet, s3…). Ex. triolet de croches : "C5e3 D5e3 E5e3".
- silences : r + durée : rw rh rhd r rd re rs rt (noire = "r").
- liaison de prolongation vers la note suivante : "~" à la fin (C5h~ C5e).
- petite note (appogiature/acciaccature) : préfixe "g" (gA5), durée nulle, juste avant la note principale.
- trémolo mesuré (barres sur la hampe, accord répété) : suffixe "*" après la durée (C4+E4h*) ; nombre de barres dans "doubt" si utile.
- accord arpégé (vague verticale) : suffixe "!" ; point d'orgue : suffixe "^".
- plusieurs voix sur une même portée (hampes haut/bas avec rythmes différents) : sépare-les par " // " (ex. "rh":"F5h. // A4e B4e C5…"). Chaque voix doit faire la mesure complète.

## Contrôle
`python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/pN.json` vérifie que chaque partie fait la durée de la mesure (3/4 = 3 noires, 6/8 = 3 noires). Tout doit être « ok » (sauf anacrouse éventuelle signalée).

---
# Architecture (v0.8)
Gravure et temps : **Verovio** (vendor/verovio-toolkit-wasm.js). Source unique : le MusicXML de l'œuvre — importé tel quel (`W.xml`), ou compilé depuis les jetons ci-dessus (`src/tok2xml.js`).
Verovio déplie les reprises (timemap) ; `src/engine.js` en tire le modèle `SC` (parties, mesures, ordre de lecture, événements).
Modules (`build.py` les assemble dans cet ordre) : core (bus, portes, stockage) · tok2xml · engine · audio (échantillons `data/sons.json`) · player · view · ui · library · mix · plan (sections, repères, enchaînements) · annot (crayon, texte) · chant · piano · text · main.
Portées masquées : on retire les portées du MEI exporté par Verovio (les xml:id des autres notes restent identiques).
Plus de chaînage de fonctions : un module s'abonne au `BUS`, pose une porte dans `GATES` ou un modificateur dans `VOLS`.
`python3 build.py` → partiteur.html (un seul fichier, hors-ligne).
