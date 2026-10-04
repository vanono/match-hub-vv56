export type MissionType = "Transport" | "Maillots" | "Collation" | "Buvette" | "Installation" | string;

export type Personne = { id: string; nom: string; joueur: string; profil: string; actif: boolean };
export type Match = {
  id: string;
  intitule: string;
  date: string | null;
  adversaire: string;
  lieu: string;
  salle: string;
  distance: number | null;
  rdv: string;
  infos: string;
};
export type Mission = { id: string; libelle: string; type: MissionType; places: number; detail: string; matchId: string };
export type Contribution = {
  id: string;
  missionId: string;
  personneId: string;
  realisePar: string;
  placesVoiture: number | null;
  statut: "Inscrit" | "Réalisé" | "Annulé" | string;
  commentaire: string;
};
export type TeamData = {
  team: {
    id: string;
    nom: string;
    categorie: string;
    saison: string;
    coach: string;
    objectifs: { Transport: number; Maillots: number; Collation: number };
  };
  personnes: Personne[];
  matchs: Match[];
  missions: Mission[];
  contributions: Contribution[];
};

export type Couverture = "Couverte" | "Partielle" | "À pourvoir";

export function activeContribs(d: TeamData, missionId: string) {
  return d.contributions.filter((c) => c.missionId === missionId && c.statut !== "Annulé");
}
export function couverture(d: TeamData, m: Mission): { inscrits: number; etat: Couverture; manque: number } {
  const inscrits = activeContribs(d, m.id).length;
  const places = Math.max(1, m.places || 1);
  const etat: Couverture = inscrits >= places ? "Couverte" : inscrits > 0 ? "Partielle" : "À pourvoir";
  return { inscrits, etat, manque: Math.max(0, places - inscrits) };
}
export function missionsOf(d: TeamData, matchId: string) {
  return d.missions.filter((m) => m.matchId === matchId);
}
export function besoinsMatch(d: TeamData, matchId: string) {
  return missionsOf(d, matchId).filter((m) => couverture(d, m).etat !== "Couverte");
}
export function isPast(m: Match) {
  if (!m.date) return false;
  return new Date(m.date).getTime() < Date.now() - 3 * 3600 * 1000;
}
export function sortMatchs(ms: Match[]) {
  return [...ms].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

const TZ = "Europe/Paris";
export const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso)) : "Date à confirmer";
export const fmtShort = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso)) : "À confirmer";
export const fmtTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso)).replace(":", "h") : "";

export const typeEmoji: Record<string, string> = {
  Transport: "🚗",
  Maillots: "👕",
  Collation: "🍎",
  Buvette: "☕",
  Installation: "🏐",
};

export function whatsappLink(d: TeamData, match: Match, origin: string) {
  const besoins = besoinsMatch(d, match.id);
  const lines = [
    `🏐 *${match.intitule || "Match vs " + match.adversaire}* – ${fmtDate(match.date)}${match.date ? " à " + fmtTime(match.date) : ""}`,
    "",
  ];
  if (besoins.length === 0) lines.push("Tout est couvert ✓ Merci à toutes et à tous !");
  else {
    lines.push("Il nous manque encore un coup de main pour :");
    for (const m of besoins) {
      const c = couverture(d, m);
      lines.push(`${typeEmoji[m.type] ?? "•"} ${m.libelle} (${c.manque} place${c.manque > 1 ? "s" : ""})`);
    }
    lines.push("", "Inscription en 10 secondes 👇");
  }
  lines.push(`${origin}/matchs/${match.id}`);
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function teamCoverage(d: TeamData) {
  const total = d.missions.length;
  const covered = d.missions.filter((m) => couverture(d, m).etat === "Couverte").length;
  return { total, covered, pct: total ? Math.round((covered / total) * 100) : 0 };
}


export type MissionDraft = { type: "Transport" | "Maillots" | "Collation" | "Buvette" | "Installation"; libelle: string; places: number; detail?: string | undefined };

// Missions proposées par défaut à la création d'un match (modifiables avant validation).
export function defaultMissions(lieu: "Domicile" | "Extérieur", adversaire: string): MissionDraft[] {
  if (lieu === "Extérieur")
    return [
      { type: "Transport", libelle: `Transport ${adversaire}`.trim(), places: 3, detail: "3 voitures de 4 places." },
      { type: "Maillots", libelle: "Lavage maillots", places: 1 },
    ];
  return [
    { type: "Collation", libelle: "Collation", places: 2, detail: "Goûter pour les deux équipes." },
    { type: "Maillots", libelle: "Lavage maillots", places: 1 },
    { type: "Installation", libelle: "Installation salle", places: 2 },
  ];
}
