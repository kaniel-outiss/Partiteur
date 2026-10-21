# Inventaire d'un recueil PDF pour Le partiteur
But : dresser le CATALOGUE complet des pièces d'un recueil (sans rien transcrire).
Outils : pdftoppm -r 60 -f A -l B -png fichier.pdf prefixe (pages en petit pour survoler), pdftoppm -r 120 pour lire un sommaire ; pdftotext -layout -f A -l B pour les PDF qui ont du texte. Lis les images avec l'outil Read. Travaille dans TON dossier (indiqué).
Méthode : 1) trouve le sommaire (début ou fin du recueil) et lis-le en entier ; 2) établis la correspondance numéro de page imprimée → page PDF (décalage) en vérifiant 3 pièces ; 3) pour CHAQUE pièce, ouvre sa 1re page (r=60 suffit souvent, r=120 si besoin) pour confirmer titre, tonalité (armure), mesure, clé du chant et la page PDF de début ; la fin = début de la suivante − 1.
Pour chaque pièce, note aussi l'état : partition gravée nette / scan correct / scan médiocre (pages coupées, penchées, floues).
Sortie : /home/claude/partiteur/scan/cat/<NOM>.json :
{"file":"…","edition":"éditeur, année si visible, langue(s) des paroles","pdf_pages":N,"offset":"page imprimée X = page PDF Y","quality":"…",
 "pieces":[{"n":1,"title":"Una furtiva lagrima","opera":"L'elisir d'amore","composer":"Gaetano Donizetti","died":1848,"role":"Nemorino","voice":"ténor","lang":"it",
   "pdf_from":12,"pdf_to":17,"key":"si♭ mineur","meter":"3/8","notes":"…"}]}
"died" = année de mort du compositeur (de ta connaissance ; null si inconnu). Ne transcris AUCUNE note. Réponds à la fin en 6 lignes max : nombre de pièces, qualité, particularités.
