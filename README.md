# Vannes Volley Connect

Construis le MVP "VV56 – Espace équipe", une web app mobile first en français pour le club Vannes Volley 56. Objectif : permettre aux familles et joueurs de s'inscrire en quelques secondes sur les missions liées aux matchs (transport, lavage des maillots, collation, installation), et donner au coach une vue sur les besoins non couverts et la répartition des contributions. Ton : positif, valorisant, jamais culpabilisant.

## Données : base Airtable existante (source de vérité)
Utilise le connecteur Airtable de Lovable. Tous les appels Airtable passent par une fonction backend (edge function) : aucune clé ni token côté navigateur. Base ID : appuPJ6oX1Hvi81BE.
- Equipes (tblD18VlUH24SHPms) : Nom, Catégorie, Saison, Coach, "Code d'accès", "Code coach", "Objectif transports", "Objectif maillots", "Objectif collations".
- Personnes (tblwMuvF5YiNFsUaP) : "Nom affiché", Joueur, Profil (Famille (joueur mineur) | Joueur majeur | Coach), Actif, Equipe (lien), "Nb transports", "Nb maillots", "Nb collations", "Total contributions" (calculés).
- Matchs (tblSqxsEFdZdQnFFm) : Intitulé, Date (dateTime, Europe/Paris), Adversaire, Lieu (Domicile | Extérieur), "Salle / Ville", "Distance AR (km)", "Heure de RDV", Infos, Equipe (lien), Missions (lien).
- Missions (tblII9HIdW16178qW) : Libellé, Type (Transport | Maillots | Collation | Buvette | Installation), "Places nécessaires", Détail, Match (lien), Contributions (lien), Inscrits (calculé), Couverture (calculé : Couverte | Partielle | À pourvoir).
- Contributions (tbl6s0cL3ub8yCIR0) : Mission (lien), Personne (lien), "Réalisé par" (ex. Papa/Maman), "Places voiture", Statut (Inscrit | Réalisé | Annulé), Commentaire.

## Accès (MVP, sans compte)
1. Écran d'accueil : saisie du code d'équipe (champ "Code d'accès" de la table Equipes, ex. VV56). Vérification côté backend. Session conservée sur l'appareil.
2. Puis choix "Je suis…" dans la liste des Personnes actives de l'équipe (famille ou joueur), mémorisé sur l'appareil, modifiable.
3. Lien discret "Espace coach" : code coach (champ "Code coach", ex. COACH56) vérifié côté backend.

## Écrans
1. Matchs : liste chronologique (prochains matchs en haut, matchs passés repliés). Chaque carte : date, adversaire, domicile/extérieur, et badge de couverture global (ex. "2 besoins à pourvoir" en orange, "Tout est couvert ✓" en vert).
2. Fiche match : infos pratiques (date, heure de RDV, lieu, distance), puis liste des missions avec jauge "Inscrits / Places nécessaires", liste des inscrits (Nom affiché + "Réalisé par"), et bouton "Je m'en occupe". Pour un transport : demander le parent qui conduit et le nombre de places voiture. Possibilité d'annuler sa propre inscription (statut Annulé). Après inscription : confirmation positive ("Merci ! 🙌").
3. Bouton "Partager sur WhatsApp" sur la fiche match : ouvre https://wa.me/?text=… avec un message prérempli listant les missions encore à pourvoir et le lien direct vers la fiche match.
4. Mes engagements : progression de la personne sélectionnée vs objectifs de l'équipe, avec barres de progression ("Transports : 2 / 3", "Maillots : 1 / 1", "Collations : 0 / 1"), historique de ses contributions, badges simples (ex. "Premier transport", "Objectif atteint"). Ajoute un indicateur collectif : "% des missions de la saison couvertes par l'équipe". Pas de classement individuel public.
5. Espace coach : (a) besoins non couverts des prochains matchs, triés par date, avec bouton de partage WhatsApp ; (b) répartition des contributions par famille (barres horizontales), en mettant en évidence les familles à 0 contribution, avec un message bienveillant ; (c) KPI : taux de couverture, nombre de familles ayant contribué / total ; (d) possibilité de passer une contribution de "Inscrit" à "Réalisé".

## Design
- Mobile first, gros boutons tactiles, lisible en une main ; correct aussi sur desktop.
- Palette bleu marine (#0B2545) et turquoise (#13C4C4), fond clair, accents orange pour "à pourvoir", vert pour "couvert".
- En-tête "Vannes Volley 56 · Espace équipe" en texte (pas de logo officiel).
- Navigation par barre d'onglets en bas : Matchs · Mes engagements · Coach.
- États vides et chargement soignés ; messages d'erreur clairs en français.

## Confidentialité
Données minimales : pas de téléphone, pas de date de naissance. Mention en pied de page : "Données utilisées uniquement pour l'organisation de l'équipe – Vannes Volley 56".

Si le connecteur Airtable n'est pas encore relié, demande-moi de le connecter avant de continuer.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://match-hub-vv56.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5c877028-d84c-4765-a4b3-993c85974fff).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
