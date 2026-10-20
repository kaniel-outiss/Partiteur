# Transcription « Madamina, il catalogo è questo » (Mozart, Don Giovanni, acte I nº 4 — gravure moderne Sibelius, IMSLP 691450) — pour Le partiteur
Domaine public (Mozart). Pages : /home/claude/partiteur/scan/mad/p-1.png … p-8.png (300 dpi, ~2550×3300). Gravure moderne NETTE : lis attentivement, c'est faisable sans erreur.
Chaque système : 3 portées : LEPORELLO (basse, clé de FA, hauteur RÉELLE), puis PIANO main droite et main gauche (attention : la main gauche change souvent de clé, sol ↔ fa).
Armure : 2 dièses (ré majeur) → écris les altérations EFFECTIVES (F#3, C#4, et les bécarres : C4…).
Mesures : les NUMÉROS de mesure sont imprimés au début de chaque système → vérifie que ton nombre de mesures colle. Allegro en 4/4 (mesures 1-84), puis « Andante con moto » en 3/4 à partir de la mesure 85 : mets "meter":"3/4" et "tempo":"Andante con moto" à la mesure 85.
Trilles (tr) : écris la note normale et mets "tr" dans marks. Indications (cresc., sfp, fp, mf…) dans marks.

Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/mad/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de BASSE : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("no-", "ble") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/mad_pN.json
{"page":N,"measures":[
 {"meter":"4/4",            // seulement pour la 1re mesure de la page 1
  "tempo":"Allegro","bpm":132, // page 1 seulement (pas de chiffre imprimé : mets 132)
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
Chaque mesure = 4 noires (4/4) ou 3 noires (3/4) dans CHAQUE partie (v, rh, lh). Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/mad_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.
