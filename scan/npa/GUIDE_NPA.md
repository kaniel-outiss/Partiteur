# Transcription « Non più andrai » (Mozart, Le nozze di Figaro, Figaro — anthologie Ricordi, gravure moderne) — pour Le partiteur
Musique du domaine public (Mozart). Pages : /home/claude/partiteur/scan/npa/p-273.png … p-281.png (300 dpi) = pages imprimées 272 à 280 de l'anthologie. Ta page N = la N-ième de cette liste (N=1 → p-273.png … N=9 → p-281.png).
La 1re page commence par le titre de l'air ; la dernière peut contenir le début d'un AUTRE air après la double barre finale : ne transcris QUE « Non più andrai ».
Chaque système : FIGARO (baryton-basse, clé de FA, hauteur RÉELLE), puis PIANO main droite et main gauche (changements de clé fréquents à la main gauche).
Armure : vérifie-la (a priori sans armure, do majeur, mais il y a des modulations : écris les altérations EFFECTIVES ; si l'armure change en cours de route, note-le dans marks "armure : …" et continue à écrire les altérations effectives).
Mesure : C (4/4). Les NUMÉROS de mesure sont imprimés au début des systèmes : vérifie ton compte.
Indications (cresc., f, p, sf, ff, a tempo…) dans marks. Trilles : note normale + "tr" dans marks.
Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/npa/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de BASSE : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("no-", "ble") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/npa_pN.json
{"page":N,"measures":[
 {"meter":"4/4",            // seulement pour la 1re mesure de la page 1
  "tempo":"(le tempo imprimé)", // page 1 seulement, pas de bpm
  "marks":["f","p","c.8va ad lib."],  // textes / nuances imprimés à cette mesure
  "v":"rw", "ly":"",        // ligne de chant ; paroles
  "rh":"…", "lh":"…",       // piano main droite / main gauche
  "doubt":"…"}              // optionnel
 ]}
Jetons (voir aussi /home/claude/partiteur/GUIDE.md) :
- note = lettre + altération + octave (C4 = do du milieu) : C4, Bb3, F#4. Accord : C4+E4+G4 (durée sur le DERNIER élément : "C4+E4+G4e").
- durée en suffixe : w ronde, h blanche, (rien) noire, e croche, s double croche, t triple ; point "d" après (hd, d, ed, sd).
- silences : rw rh r re rs (+ d pour pointé : rhd, rd, red).
- liaison de prolongation : "~" à la fin (C4h~ C4e). Petite note : préfixe "g" (gD5). Trémolo : "*". Arpège : "!". Point d'orgue : "^".
- triolet : suffixe 3 (e3).
- plusieurs voix sur une portée (hampes haut/bas, rythmes différents) : " // " ; chaque voix fait la mesure complète.
Chaque mesure = 4 noires dans CHAQUE partie (v, rh, lh). Mets "meter":"4/4" sur la 1re mesure de TA page (pour le contrôle). Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/npa_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.
