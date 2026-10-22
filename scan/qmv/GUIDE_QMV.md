# Transcription « Quando men vo » (valse de Musetta — Puccini, La bohème, acte II — G. Schirmer Opera Anthology, Arias for Soprano) — pour Le partiteur
Musique du domaine public (Puccini, † 1924).
Pages : /home/claude/partiteur/scan/qmv/p-152.png … p-155.png (300 dpi) = pages imprimées 152-155. Ta page N : N=1 → p-152.png … N=4 → p-155.png. Scan de reliure, avec des ANNOTATIONS MANUSCRITES au crayon (ignore-les entièrement).
Reporte chaque indication de tempo/expression dans marks ; "meter" à chaque changement de mesure, "ks" (positif = dièses, négatif = bémols) à chaque changement d'armure. Vérifie le numéro de page imprimé et signale tout désordre.
Paroles italiennes (ignore toute traduction et toute annotation au crayon) : une syllabe par note chantée, trait d'union final = syllabe coupée, "_" = mélisme ; élision « ‿ » = une seule note. Rubato fréquent (quasi rit., a tempo, rall.) dans marks ; points d'orgue ^ ; triolets/sextolets (s%6:4). Arrête-toi à la double barre finale p. 155.
La 1re page commence par le titre ; si un système n'a pas de portée de chant, chant = silences.
La 1re page commence par le titre de l'air ; la dernière peut contenir le début d'un AUTRE air après la double barre finale : ne transcris QUE cet air.
Chaque système : MUSETTA (soprano, clé de SOL, hauteur réelle), puis PIANO main droite et main gauche (changements de clé fréquents à la main gauche).
Armure : mi majeur (4) ; écris toujours les altérations EFFECTIVES.
Mesure : introduction en C (4/4, Allegro), puis 3/4 « Tempo di Valse lento (♩ = 104) » ; changements de chiffrage plus loin (C…) : "meter" à chaque changement — mets "meter" sur la 1re mesure de TA page ET à chaque changement. Si les numéros de mesure sont imprimés, vérifie ton compte.
Indications (cresc., f, p, sf, ff, a tempo…) dans marks. Trilles : note normale + "tr" dans marks.
Règles absolues : transcrire FIDÈLEMENT ce qui est imprimé, mesure par mesure ; ne JAMAIS compléter de mémoire (même si tu connais l'air) ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (le système entier puis des crops de ~1/2 ou 1/3 de largeur), agrandis ×2 les passages denses (accords, doubles croches, altérations, lignes supplémentaires) et lis-les avec l'outil Read (images). Travaille dans TON dossier /home/claude/partiteur/scan/qmv/agN/ (N = numéro de page) pour ne pas écraser les images des autres.
- Attention aux CHANGEMENTS DE CLÉ dans les portées du piano, aux altérations accidentelles (valables jusqu'à la barre), aux notes en « c.8va ad lib. » (écris les notes imprimées en gros, mets la mention dans marks).
- Les paroles sont sous la portée de CHANT : une syllabe par note chantée (pas pour silences, notes liées ~, petites notes) ; trait d'union final = syllabe coupée ("no-", "ble") ; "_" = mélisme (note qui prolonge la syllabe précédente, ex. "strength- _ _ _ en").

## Format de sortie : /home/claude/partiteur/data/qmv_pN.json
{"page":N,"measures":[
 {"meter":"3/4",            // 1re mesure de la page 1 et à chaque changement de mesure
  "tempo":"(le tempo imprimé)", // page 1 seulement, pas de bpm
  "marks":["f","p","c.8va ad lib."],  // textes / nuances imprimés à cette mesure
  "v":"rw", "ly":"",        // ligne de chant ; paroles
  "rh":"…", "lh":"…",       // piano main droite / main gauche
  "doubt":"…"}              // optionnel
 ]}
Jetons (voir aussi /home/claude/partiteur/GUIDE.md) :
- note = lettre + altération + octave (C4 = do du milieu) : C4, Bb3, F#4. Accord : C4+E4+G4 (durée sur le DERNIER élément : "C4+E4+G4e").
- durée en suffixe : w ronde, h blanche, (rien) noire, e croche, s double croche, t triple, x quadruple croche ; point "d" après (hd, d, ed, sd).
- silences : rw rh r re rs (+ d pour pointé : rhd, rd, red).
- liaison de prolongation : "~" à la fin (C4h~ C4e). Petite note : préfixe "g" (gD5). Trémolo : "*". Arpège : "!". Point d'orgue : "^".
- triolet : suffixe 3 (e3).
- plusieurs voix sur une portée (hampes haut/bas, rythmes différents) : " // " ; chaque voix fait la mesure complète.
Chaque mesure doit avoir la durée de sa mesure (2/4 = 2 noires, 4/4 = 4, 3/4 = 3, 6/8 = 3) dans CHAQUE partie (v, rh, lh). Mets "meter" sur la 1re mesure de TA page (pour le contrôle) et à chaque changement. Vérifie : python3 /home/claude/partiteur/chk.py /home/claude/partiteur/data/qmv_pN.json → 0 erreur.
Mesure coupée entre deux pages ou anacrouse : signale-le dans "doubt".
À la fin, réponds en 5 lignes max : nombre de mesures, doutes principaux.

Dans "marks", ne mets QUE des indications imprimées (nuances, tempo, expressions) — tes remarques de lecture (accents, staccato, liaisons, clés…) vont dans "doubt".
Levée (mesure incomplète au début) : "len": nombre de noires réelles, en plus de "meter".
Contrôle des paroles : python3 /home/claude/partiteur/tools/chk_ly.py PX (PX = préfixe, depuis /home/claude/partiteur) → aucune ligne = OK. Une note LIÉE (~) depuis la note précédente ne reçoit PAS de syllabe ni de "_" ; dans une portée à 2 voix (" // "), les paroles suivent la 1re voix : mets en premier la voix qui porte le texte.
