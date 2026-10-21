# Transcription « Largo al factotum » (Rossini, Il barbiere di Siviglia, nº 4, cavatine de Figaro — partition chant-piano ancienne, Schirmer) — pour Le partiteur
Domaine public. Pages : /home/claude/partiteur/scan/fig/p-01.png … p-11.png (300 dpi, 2550×3300) — attention au zéro : p-01, p-02…
L'AIR SEUL : il commence page 1 à « Nº 4. Largo al factotum della città — Cavatina » (les 2 systèmes au-dessus = fin d'un récitatif : IGNORE-LES) et finit page 11 à la double barre (après, « Recit. » : IGNORE).
Chaque système de l'air : la portée de FIGARO (baryton, clé de FA, hauteur RÉELLE) puis PIANO main droite et main gauche ; l'introduction (page 1) n'a que le piano → v = silences.
Paroles : deux lignes sous le chant, ITALIEN (en haut) et anglais (en bas) : ne transcris QUE l'ITALIEN.
Armure : vérifie (a priori aucune = do majeur ; écris les altérations EFFECTIVES). Mesure 6/8 (Allegro vivace) : en 6/8 une mesure = 3 noires ; une croche = e, noire pointée = d, blanche pointée = hd.
Indications (cresc., rinf., f, p, Tutti, Str.…) dans marks. Trilles : note normale + "tr" dans marks.
Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/fig/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de BASSE : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("no-", "ble") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/fig_pN.json
{"page":N,"measures":[
 {"meter":"6/8",            // OBLIGATOIRE sur la 1re mesure de TA page (pour le contrôle)
  "tempo":"Allegro vivace", // 1re mesure de l'air seulement (page 1), pas de bpm
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
Chaque mesure = 3 noires (6/8) dans CHAQUE partie (v, rh, lh). Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/fig_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.
