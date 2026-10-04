import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TeamData, Contribution } from "./vv56-types";

const codeSchema = z.string().trim().min(1).max(40);

async function requireTeam(code: string) {
  const { findTeamByCode } = await import("./airtable.server");
  const team = await findTeamByCode(code);
  if (!team) throw new Error("Code d'équipe inconnu.");
  return team;
}

export const verifyTeamCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const { findTeamByCode } = await import("./airtable.server");
    const team = await findTeamByCode(data.code);
    return team ? { ok: true as const, nom: String(team.fields["Nom"] ?? "") } : { ok: false as const };
  });

export const getTeamData = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }): Promise<TeamData> => {
    const { listAll, T } = await import("./airtable.server");
    const team = await requireTeam(data.code);
    const [personnes, matchs, missions, contributions] = await Promise.all([
      listAll(T.personnes),
      listAll(T.matchs),
      listAll(T.missions),
      listAll(T.contributions),
    ]);
    const inTeam = (r: { fields: any }) => (r.fields["Equipe"] ?? []).includes(team.id);
    const ms = matchs.filter(inTeam);
    const matchIds = new Set(ms.map((m) => m.id));
    const mis = missions.filter((m) => (m.fields["Match"] ?? []).some((id: string) => matchIds.has(id)));
    const misIds = new Set(mis.map((m) => m.id));
    const f = team.fields;
    return {
      team: {
        id: team.id,
        nom: f["Nom"] ?? "",
        categorie: f["Catégorie"] ?? "",
        saison: f["Saison"] ?? "",
        coach: f["Coach"] ?? "",
        objectifs: {
          Transport: f["Objectif transports"] ?? 0,
          Maillots: f["Objectif maillots"] ?? 0,
          Collation: f["Objectif collations"] ?? 0,
        },
      },
      personnes: personnes.filter(inTeam).map((p) => ({
        id: p.id,
        nom: p.fields["Nom affiché"] ?? "Sans nom",
        joueur: p.fields["Joueur"] ?? "",
        profil: p.fields["Profil"] ?? "",
        actif: !!p.fields["Actif"],
      })),
      matchs: ms.map((m) => ({
        id: m.id,
        intitule: m.fields["Intitulé"] ?? "",
        date: m.fields["Date"] ?? null,
        adversaire: m.fields["Adversaire"] ?? "",
        lieu: m.fields["Lieu"] ?? "",
        salle: m.fields["Salle / Ville"] ?? "",
        distance: m.fields["Distance AR (km)"] ?? null,
        rdv: m.fields["Heure de RDV"] ?? "",
        infos: m.fields["Infos"] ?? "",
      })),
      missions: mis.map((m) => ({
        id: m.id,
        libelle: m.fields["Libellé"] ?? "",
        type: m.fields["Type"] ?? "",
        places: m.fields["Places nécessaires"] ?? 1,
        detail: m.fields["Détail"] ?? "",
        matchId: (m.fields["Match"] ?? [])[0] ?? "",
      })),
      contributions: contributions
        .filter((c) => (c.fields["Mission"] ?? []).some((id: string) => misIds.has(id)))
        .map(
          (c): Contribution => ({
            id: c.id,
            missionId: c.fields["Mission"][0],
            personneId: (c.fields["Personne"] ?? [])[0] ?? "",
            realisePar: c.fields["Réalisé par"] ?? "",
            placesVoiture: c.fields["Places voiture"] ?? null,
            statut: c.fields["Statut"] ?? "Inscrit",
            commentaire: c.fields["Commentaire"] ?? "",
          }),
        ),
    };
  });

async function assertMissionInTeam(teamId: string, missionId: string) {
  const { getRecord, T } = await import("./airtable.server");
  const mission = await getRecord(T.missions, missionId);
  const matchId = (mission.fields["Match"] ?? [])[0];
  if (!matchId) throw new Error("Mission introuvable.");
  const match = await getRecord(T.matchs, matchId);
  if (!(match.fields["Equipe"] ?? []).includes(teamId)) throw new Error("Mission introuvable.");
}

const recId = z.string().regex(/^rec[a-zA-Z0-9]{14}$/);

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: codeSchema,
        missionId: recId,
        personneId: recId,
        realisePar: z.string().trim().max(60).optional(),
        placesVoiture: z.number().int().min(1).max(9).optional(),
        commentaire: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getRecord, createRecord, T } = await import("./airtable.server");
    const team = await requireTeam(data.code);
    const p = await getRecord(T.personnes, data.personneId);
    if (!(p.fields["Equipe"] ?? []).includes(team.id)) throw new Error("Personne inconnue.");
    await assertMissionInTeam(team.id, data.missionId);
    const { listAll } = await import("./airtable.server");
    const mission = await getRecord(T.missions, data.missionId);
    const actives = (await listAll(T.contributions)).filter(
      (c) => (c.fields["Mission"] ?? [])[0] === data.missionId && c.fields["Statut"] !== "Annulé",
    );
    if (actives.some((c) => (c.fields["Personne"] ?? [])[0] === data.personneId))
      throw new Error("Vous êtes déjà inscrit·e sur cette mission.");
    if (actives.length >= Math.max(1, Number(mission.fields["Places nécessaires"]) || 1))
      throw new Error("Cette mission vient d'être couverte. Merci quand même !");
    const fields: Record<string, any> = {
      Mission: [data.missionId],
      Personne: [data.personneId],
      Statut: "Inscrit",
    };
    if (data.realisePar) fields["Réalisé par"] = data.realisePar;
    if (data.placesVoiture) fields["Places voiture"] = data.placesVoiture;
    if (data.commentaire) fields["Commentaire"] = data.commentaire;
    const r = await createRecord(T.contributions, fields);
    return { id: r.id as string };
  });

export const cancelContribution = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema, contributionId: recId, personneId: recId }).parse(d))
  .handler(async ({ data }) => {
    const { getRecord, updateRecord, T } = await import("./airtable.server");
    const team = await requireTeam(data.code);
    const c = await getRecord(T.contributions, data.contributionId);
    if ((c.fields["Personne"] ?? [])[0] !== data.personneId) throw new Error("Cette inscription n'est pas la vôtre.");
    await assertMissionInTeam(team.id, c.fields["Mission"][0]);
    await updateRecord(T.contributions, data.contributionId, { Statut: "Annulé" });
    return { ok: true };
  });

async function requireCoach(code: string, coachCode: string) {
  const team = await requireTeam(code);
  const expected = String(team.fields["Code coach"] ?? "").trim().toUpperCase();
  if (!expected || expected !== coachCode.trim().toUpperCase()) throw new Error("Code coach incorrect.");
  return team;
}

export const verifyCoachCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema, coachCode: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    try {
      await requireCoach(data.code, data.coachCode);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const markDone = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ code: codeSchema, coachCode: codeSchema, contributionId: recId }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getRecord, updateRecord, T } = await import("./airtable.server");
    const team = await requireCoach(data.code, data.coachCode);
    const c = await getRecord(T.contributions, data.contributionId);
    await assertMissionInTeam(team.id, c.fields["Mission"][0]);
    await updateRecord(T.contributions, data.contributionId, { Statut: "Réalisé" });
    return { ok: true };
  });

// Heure locale de Paris ("2026-10-18", "15:00") -> ISO UTC, indépendamment du fuseau du serveur.
function parisToIso(date: string, time: string) {
  const [y = 0, mo = 1, d = 1] = date.split("-").map(Number);
  const [h = 0, mi = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Ce que l'horloge de Paris affiche à l'instant `guess`, relu comme si c'était de l'UTC.
  const shown = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "Europe/Paris" }) + " UTC").getTime();
  return new Date(guess - (shown - guess)).toISOString();
}

const missionInput = z.object({
  type: z.enum(["Transport", "Maillots", "Collation", "Buvette", "Installation"]),
  libelle: z.string().trim().min(1).max(80),
  places: z.number().int().min(1).max(10),
  detail: z.string().trim().max(200).optional(),
});

const matchInput = {
  code: codeSchema,
  coachCode: codeSchema,
  adversaire: z.string().trim().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure: z.string().regex(/^\d{2}:\d{2}$/),
  lieu: z.enum(["Domicile", "Extérieur"]),
  salle: z.string().trim().max(80).optional(),
  rdv: z.string().trim().max(80).optional(),
  distance: z.number().int().min(0).max(2000).optional(),
  infos: z.string().trim().max(300).optional(),
};
type MatchInput = { adversaire: string; date: string; heure: string; lieu: "Domicile" | "Extérieur"; salle?: string | undefined; rdv?: string | undefined; distance?: number | undefined; infos?: string | undefined };

// Champs Airtable du match. Les champs facultatifs vides sont remis à zéro (utile en modification).
function matchFields(j: string, d: MatchInput) {
  const dom = d.lieu === "Domicile";
  return {
    "Intitulé": `${j} – ${dom ? `VV56 vs ${d.adversaire}` : `${d.adversaire} vs VV56`}`,
    Date: parisToIso(d.date, d.heure),
    Adversaire: d.adversaire,
    Lieu: d.lieu,
    "Salle / Ville": d.salle || null,
    "Heure de RDV": d.rdv || null,
    "Distance AR (km)": d.distance ?? null,
    Infos: d.infos || null,
  };
}
const missionFields = (j: string, m: z.infer<typeof missionInput>) => ({
  "Libellé": `${j} – ${m.libelle}`,
  Type: m.type,
  "Places nécessaires": m.places,
  "Détail": m.detail || null,
});

export const createMatch = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...matchInput, missions: z.array(missionInput).max(8) }).parse(d))
  .handler(async ({ data }) => {
    const { listAll, createRecord, createRecords, T } = await import("./airtable.server");
    const team = await requireCoach(data.code, data.coachCode);
    const existing = (await listAll(T.matchs)).filter((m) => (m.fields["Equipe"] ?? []).includes(team.id));
    const j = `J${existing.length + 1}`;
    const match = await createRecord(T.matchs, { ...matchFields(j, data), Equipe: [team.id] });
    if (data.missions.length)
      await createRecords(
        T.missions,
        data.missions.map((m) => ({ ...missionFields(j, m), Match: [match.id] })),
      );
    return { id: match.id as string };
  });

async function requireCoachMatch(code: string, coachCode: string, matchId: string) {
  const { getRecord, listAll, T } = await import("./airtable.server");
  const team = await requireCoach(code, coachCode);
  const match = await getRecord(T.matchs, matchId);
  if (!(match.fields["Equipe"] ?? []).includes(team.id)) throw new Error("Match introuvable.");
  const missionIds: string[] = match.fields["Missions"] ?? [];
  const actives = (await listAll(T.contributions)).filter(
    (c) => missionIds.includes((c.fields["Mission"] ?? [])[0]) && c.fields["Statut"] !== "Annulé",
  );
  const j = /^J\d+/.exec(String(match.fields["Intitulé"] ?? ""))?.[0] ?? "J?";
  return { match, missionIds, actives, j };
}

export const updateMatch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        ...matchInput,
        matchId: recId,
        missions: z.array(missionInput.extend({ id: recId.optional() })).max(8),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { updateRecord, createRecords, deleteRecords, T } = await import("./airtable.server");
    const { missionIds, actives, j } = await requireCoachMatch(data.code, data.coachCode, data.matchId);
    const kept = new Set(data.missions.flatMap((m) => (m.id ? [m.id] : [])));
    if ([...kept].some((id) => !missionIds.includes(id))) throw new Error("Mission introuvable.");
    const removed = missionIds.filter((id) => !kept.has(id));
    if (actives.some((c) => removed.includes((c.fields["Mission"] ?? [])[0])))
      throw new Error("Impossible de retirer une mission qui a déjà des inscrits.");
    await updateRecord(T.matchs, data.matchId, matchFields(j, data));
    for (const m of data.missions) if (m.id) await updateRecord(T.missions, m.id, missionFields(j, m));
    const added = data.missions.filter((m) => !m.id);
    if (added.length)
      await createRecords(
        T.missions,
        added.map((m) => ({ ...missionFields(j, m), Match: [data.matchId] })),
      );
    if (removed.length) await deleteRecords(T.missions, removed);
    return { ok: true };
  });

export const deleteMatch = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema, coachCode: codeSchema, matchId: recId }).parse(d))
  .handler(async ({ data }) => {
    const { deleteRecords, T } = await import("./airtable.server");
    const { missionIds, actives } = await requireCoachMatch(data.code, data.coachCode, data.matchId);
    if (actives.length) throw new Error("Ce match a déjà des inscrits : annulez d'abord leurs inscriptions.");
    if (missionIds.length) await deleteRecords(T.missions, missionIds);
    await deleteRecords(T.matchs, [data.matchId]);
    return { ok: true };
  });
