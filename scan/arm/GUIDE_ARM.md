# Transcription « Arm, arm ye brave! » (Haendel, Judas Maccabaeus, éd. Prout, Ditson 1915) — pour Le partiteur
Domaine public. Pages : /home/claude/partiteur/scan/arm/p-1.png … p-7.png (220 dpi, 2033×2645) = pages imprimées 153 à 159.
Chaque page : 4 systèmes de 3 portées : BASSE (chant, clé de FA, hauteur RÉELLE — écris ce qui est imprimé), puis PIANO main droite (clé de sol en général) et main gauche (clé de fa en général).
Tonalité : FA majeur ? NON — vérifie l'armure sur la page (l'édition semble sans armure = do majeur ; si tu vois un bémol, c'est fa majeur). Mesure : C (4/4). Allegro (♩ = 80 si lisible).

Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/arm/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de BASSE : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("no-", "ble") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/arm_pN.json
{"page":N,"measures":[
 {"meter":"4/4",            // seulement pour la 1re mesure de la page 1
  "tempo":"Allegro","bpm":80, // page 1 seulement
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
Chaque mesure = 4 noires dans CHAQUE partie (v, rh, lh). Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/arm_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.
