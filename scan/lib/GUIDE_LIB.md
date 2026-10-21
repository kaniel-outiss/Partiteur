# Transcription « Libera me » (Fauré, Requiem op. 48, n° VI — éd. Nancho Alvarez, gravure LilyPond) — pour Le partiteur
Musique du domaine public (Fauré, † 1924). Pages : /home/claude/partiteur/scan/lib/p-1.png, p-2.png, p-3.png (300 dpi) = pages imprimées 12, 13, 14. Ta page N = p-N.png.
Pièce CHORALE : 4 voix (Soprano, Alto, Tenor, Bajo = basse) + une portée « Orquesta » (réduction d'orchestre sur UNE portée, clé de fa). Tempo Moderato.
Au début (systèmes 1 à 4 de la page 12), SEULE la basse (solo « Libera me ») et l'orchestre sont imprimés : les autres voix sont absentes → silences. Plus loin, certains systèmes n'impriment que S + B, ou S + A + T + B ; une voix absente d'un système = silences pour ses mesures.
Armure : 1 bémol (ré mineur) a priori ; si elle change, mets "ks" (négatif = bémols) sur la mesure concernée. Mesure : C (4/4) ; il y a un passage à 6/4 (ou autre) : mets "meter" sur la 1re mesure de ta page ET à chaque changement. Les numéros de mesure et les LETTRES de repère (A, B, C…) sont imprimés : vérifie ton compte et mets la lettre dans marks (ex. "[A]").
Règles absolues : transcrire FIDÈLEMENT, mesure par mesure ; ne JAMAIS compléter de mémoire ; chaque doute → champ "doubt".

## Méthode
- Découpe chaque système avec PIL (système entier puis crops ~1/3 de largeur), agrandis ×2 les passages denses, lis avec l'outil Read (images). Travaille dans /home/claude/partiteur/scan/lib/agN/ (N = ta page).
- Ténor : clé de SOL octaviée (« 8 » sous la clé) : écris les notes TELLES QU'ÉCRITES en clé de sol (l'appli les fait sonner à l'octave inférieure). Basse et Orquesta : clé de fa, hauteur réelle.
- Paroles latines : une syllabe par note chantée (pas pour silences, notes liées ~) ; trait d'union final = syllabe coupée ("Li-", "be-", "ra") ; "_" = mélisme ; élision écrite avec "‿" sur une seule note. Orthographe imprimée (« æ » : écris « æ » comme imprimé, ex. « æ- ter- na »).

## Format de sortie : /home/claude/partiteur/data/lib_pN.json
{"page":N,"measures":[
 {"meter":"4/4", "ks":-1,       // 1re mesure de TA page (et à chaque changement)
  "tempo":"Moderato",            // page 1 seulement
  "marks":["p","[A]","cresc."],  // indications imprimées (nuances, lettres, tempo, Solo, Tutti…)
  "s":"…","ls":"…",             // soprano + paroles
  "a":"…","la":"…",             // alto + paroles
  "t":"…","lt":"…",             // ténor + paroles
  "b":"…","lb":"…",             // basse + paroles
  "orc":"…",                    // portée Orquesta
  "doubt":"…"}
 ]}
Jetons (voir aussi /home/claude/partiteur/GUIDE.md) :
- note = lettre + altération + octave (C4 = do du milieu) : C4, Bb3, F#4. Accord : C4+E4+G4 (durée sur le DERNIER élément).
- durée en suffixe : w ronde, h blanche, (rien) noire, e croche, s double, t triple, x quadruple ; point "d" après (hd, d, ed). Silences : rw rh r re rs (+ d).
- liaison de prolongation : "~" à la fin (C4h~ C4e). Petite note : préfixe "g". Point d'orgue : "^". Triolet : suffixe 3 (e3).
- plusieurs voix sur une portée (hampes opposées, rythmes différents, ex. Orquesta) : " // " ; chaque voix fait la mesure complète.
Chaque partie (s, a, t, b, orc) doit avoir la durée de la mesure (4/4 = 4 noires). Une voix absente du système = "rw" (ou silences équivalents), paroles vides.
Vérifie : python3 /home/claude/partiteur/tools/chk_satb.py /home/claude/partiteur/data/lib_pN.json → 0 erreur.
À la fin, réponds en 5 lignes max : numéros de mesure couverts, doutes principaux.
