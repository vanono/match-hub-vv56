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
