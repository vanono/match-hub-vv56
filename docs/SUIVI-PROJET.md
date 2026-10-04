# VV56 – Suivi du projet (MVP)

> Fichier de mémoire du projet. À lire en début de toute nouvelle session,
> et à mettre à jour après chaque décision ou livraison.
> Dernière mise à jour : 04/10/2026.

## 1. Contexte

- Application d'organisation de la vie d'équipe du **Vannes Volley 56** :
  transports, lavage des maillots, collations, installation de la salle.
- Porteur : Sébastien (parent). Coach de l'équipe pilote : **Laury**.
- **Démo Jedha : 15/10/2026** (visio, 3 min).
- Données **fictives** uniquement (prénom + initiale).

## 2. Ressources

| Élément | Référence |
|---|---|
| Airtable | base « VV56 – Engagement & vie d'équipe (MVP) » – `appuPJ6oX1Hvi81BE` |
| Lovable | projet « Vannes Volley Connect » – https://lovable.dev/projects/5c877028-d84c-4765-a4b3-993c85974fff |
| Aperçu | https://id-preview--5c877028-d84c-4765-a4b3-993c85974fff.lovable.app (peut demander un compte Lovable) |
| GitHub | `vanono/match-hub-vv56` (privé, synchronisé avec Lovable sur `main`) |
| Stack | TanStack Start / TypeScript / Tailwind, serveur → Airtable via passerelle Lovable |
| Codes de démo | équipe `VV56`, coach `COACH56` |

Le site **publié** ne se met à jour qu'avec **Publier → Mettre à jour** dans Lovable.
Plan Lovable gratuit : crédits limités, d'où les corrections faites via GitHub.

## 3. Fonctionnement actuel de l'application

**Accès**
1. Écran d'accueil : logo + saisie du code équipe. Mention RGPD affichée ici uniquement.
2. « Pour quelle joueuse ? » : liste des prénoms seuls (champ Airtable `Joueur`), lien « Accès COACH » en bas.
3. Un prénom → espace équipe (onglets Matchs, Mes engagements).
   « Accès COACH » + code coach → espace coach (onglets Tableau de bord, Matchs).
4. Un seul profil actif à la fois ; changer de profil = déconnexion (icône en haut à droite).

**Bandeau** : logo + nom de l'équipe (champ Airtable Equipes `Nom affiché`, repli « Vannes Volley 56 »),
affiché dès la saisie du code. « Espace coach » en sous-titre côté coach.

**Espace équipe**
- Fiche match : infos condensées dans l'en-tête, missions juste dessous (« Je m'en occupe », annulation),
  partage WhatsApp en bouton secondaire en bas.
- Mes engagements : progression vs objectifs (3 transports / 1 maillots / 1 collation), badges, historique.

**Espace coach**
- Tableau de bord (ordre volontairement conservé) : Créer un match → chiffres clés →
  Besoins non couverts → Répartition des contributions → Valider les missions → Paramètres de l'équipe.
- Créer / modifier / supprimer un match ; missions proposées automatiquement
  (extérieur : Transport ×3 + Maillots ; domicile : Collation ×2 + Maillots + Installation ×2).
- Valider les missions : « Réalisé » ou « Non réalisé » (= statut Annulé + commentaire).
- Paramètres de l'équipe : nom affiché, code d'accès des joueuses
  (le changer déconnecte les appareils, qui voient « Le code d'accès de l'équipe a changé »).
- Le coach ne peut pas s'inscrire à une mission.

**Design**
- Couleurs du logo : bleu `#245785`, rose `#EA3369` (assombri en `#D82760` pour les boutons, contraste 4,8:1).
- Espace équipe : bleu dominant, accent rose. Espace coach : framboise dominant, accent bleu.
- Une couleur par sens : rose = action, orange = il manque quelqu'un, vert = couvert.
- Icônes au trait (lucide) à la place des emojis ; emojis conservés uniquement dans le message WhatsApp.

## 4. Décisions prises (et pourquoi)

| Date | Décision | Raison |
|---|---|---|
| 04/10 | Couverture calculée côté client à partir des contributions non annulées | Mise à jour instantanée après inscription |
| 04/10 | Profils famille / coach exclusifs, couleurs distinctes | Éviter toute confusion de rôle |
| 04/10 | Accès par prénom de la joueuse, coach via lien discret | 1 seul clic pour 95 % des utilisateurs, clair pour les parents |
| 04/10 | Pas d'emoji ni de texte explicatif sur les boutons d'accès | Demande de Sébastien : sobriété |
| 04/10 | Tableau de bord coach : ordre des sections **inchangé** | Réorganisation testée puis refusée |
| 04/10 | Libellés « joueuses » plutôt que « familles » côté coach | Cohérence avec l'accès par prénom |
| 04/10 | « Non réalisé » enregistré comme Annulé + commentaire | Pas de nouveau statut Airtable (à revoir si besoin de stats distinctes) |
| 04/10 | Mention RGPD uniquement sur l'écran d'accueil | Information requise (données de mineures) sans alourdir l'app |
| 04/10 | Champ Airtable `Nom affiché` ajouté dans Equipes | Nom d'équipe modifiable par le coach sans toucher au nom interne |

## 5. État des données de démo (au 04/10)

- Matchs J1 à J6 + **J7 « Lorient vs VV56 » = match de test** créé pendant les essais (à supprimer avant la démo).
- Dates décalées : J2 Quimper **18/10 15h00**, J3 Saint-Brieuc **25/10 16h00** (pour rester « à venir » le 15/10).
- J2 – Transport Quimper : **2/3** attendu (Léa M. + Inès B. inscrites).
- Inscriptions de test déjà annulées : n°10 et n°13 (Emma G.), n°12 (Camille F.).
- `Nom affiché` de l'équipe : **vide** (à saisir par le coach, ex. « Les M18 »).

## 6. Procédure « reset démo » (à faire le 14/10)

1. Table **Contributions** : passer en `Annulé` toute inscription récente (créée après le 04/10)
   sur « J2 – Transport Quimper », pour revenir à **2/3** (Léa M. + Inès B. uniquement).
2. Annuler les autres inscriptions de test laissées par Laury ou les joueuses, si elles faussent le scénario.
3. Supprimer le match test **J7** et ses missions (espace coach → fiche match → Modifier → Supprimer,
   possible seulement si personne n'y est inscrit).
4. Vérifier que J2 et J3 sont bien après le 15/10.
5. Vérifier dans l'espace coach : « 6 joueuses à 0 » et Léa M. sur-sollicitée.
6. Lovable : **Publier → Mettre à jour**.

## 7. Scénario de démo (3 min)

1. Lien WhatsApp → code `VV56` → « Manon L. ».
2. Fiche J2 Quimper : transport 2/3 → « Je m'en occupe » → couvert.
3. Mes engagements : progression transports.
4. Espace coach : besoins non couverts + répartition (Léa M. sur-sollicitée, 6 joueuses à 0).

Astuce : une fenêtre normale (Manon L.) + une fenêtre privée (coach) pour passer de l'une à l'autre
sans se déconnecter.

## 8. Points en attente

- [ ] Saisir le nom de l'équipe (coach → Paramètres de l'équipe).
- [ ] Publier sur Lovable avant d'envoyer le lien à Laury et aux joueuses.
- [ ] Envoyer le mail à Laury (brouillon rédigé : présentation, codes, tests, retours avant le 10/10).
- [ ] Envoyer le message WhatsApp aux joueuses (via la fille de Sébastien ; retours transmis par elle).
- [ ] Revue Laury (8–10/10) : objectifs par joueuse, missions par défaut, simplicité, manques.
- [ ] Ne pas changer le code `VV56` avant le 15/10 (il figure dans les messages envoyés).
- [ ] Reset démo le 14/10 (section 6).
- [ ] 11–13/10 : deck + scénario ; 14/10 : répétition + plan B (vidéo 2 min, captures).

## 9. Méthode de travail

- Développement sur une branche `claude/…`, puis PR et **fusion en merge commit** dans `main`
  (jamais de force-push ni de rebase sur ce qui est publié : Lovable perdrait son historique).
- Avant toute fusion : typecheck, build, tests, et **captures d'écran montrées à Sébastien**.
- Captures : l'app est lancée en local avec une copie des données Airtable (lecture seule,
  module Airtable remplacé par un faux en dehors du dépôt) – rien n'est écrit dans Airtable.
- Après fusion : Lovable se synchronise seul ; publier pour mettre à jour le site public.
- Préférences de Sébastien : réponses en français, directes et structurées ;
  analyse et recommandation avant toute modification d'ergonomie ; sobriété visuelle.
