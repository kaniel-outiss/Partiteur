# Transcription « Les berceaux » (Fauré, op. 23 n° 1, poème de Sully Prudhomme — 30 Songs, éd. Kagen, International Music Co., voix moyenne) — pour Le partiteur
Musique du domaine public (Fauré, † 1924). Pages : /home/claude/partiteur/scan/ber/p-031.png … p-033.png (300 dpi). Ta page N : N=1 → p-031.png … N=3 → p-033.png.
Cette édition imprime les paroles françaises ET une traduction anglaise sous la portée de chant : ne transcris QUE le FRANÇAIS dans "ly". Reporte chaque indication de tempo/expression dans marks (Andantino, rall., a tempo, dolce…).
La 1re page commence par le titre ; si un système n'a pas de portée de chant, chant = silences.
La 1re page commence par le titre de l'air ; la dernière peut contenir le début d'un AUTRE air après la double barre finale : ne transcris QUE cet air.
Chaque système : VOIX (clé de SOL, voix moyenne : écris les notes telles qu'écrites), puis PIANO main droite et main gauche (changements de clé fréquents à la main gauche).
Armure : a priori 5 bémols (si♭ mineur), avec probable passage au majeur (si♭ majeur, 2 bémols) ; si elle change, mets "ks" (négatif = bémols) sur la mesure concernée, et écris toujours les altérations EFFECTIVES.
Mesure : a priori 12/8 (= 6 noires par mesure), avec un passage en 6/8 (= 3 noires) vers la fin de la page 2 : mets "meter" sur la 1re mesure de TA page ET à chaque changement. Triolets inutiles en 12/8 : croche = "e", noire pointée = "d".
Indications (cresc., f, p, sf, ff, a tempo…) dans marks. Trilles : note normale + "tr" dans marks.
Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/ber/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de CHANT : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("som-", "meil") ; e muet chanté = syllabe à part ("ri-", "ve") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/ber_pN.json
{"page":N,"measures":[
 {"meter":"12/8",           // 1re mesure de la page 1 et à chaque changement de mesure
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
Chaque mesure doit avoir la durée de sa mesure (12/8 = 6 noires, 6/8 = 3) dans CHAQUE partie (v, rh, lh). Mets "meter" sur la 1re mesure de TA page (pour le contrôle) et à chaque changement. Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/ber_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.

Dans "marks", ne mets QUE des indications imprimées (nuances, tempo, expressions) — tes remarques de lecture (accents, staccato, liaisons, clés…) vont dans "doubt".
Levée (mesure incomplète au début) : "len": nombre de noires réelles, en plus de "meter".
