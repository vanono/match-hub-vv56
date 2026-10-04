import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bus, Home, Minus, Plus, Trash2, X } from "lucide-react";
import { MissionIcon } from "./MissionIcon";
import { Btn } from "./ui";
import { useRefreshTeam, useSession } from "@/lib/session";
import { createMatch, deleteMatch, updateMatch } from "@/lib/vv56.functions";
import { activeContribs, defaultMissions, missionsOf, type Match, type MissionDraft, type TeamData } from "@/lib/vv56-types";

const input = "h-12 w-full rounded-xl border-2 border-input bg-background px-3 outline-none focus:border-ring";
const ALL_TYPES: MissionDraft["type"][] = ["Transport", "Maillots", "Collation", "Buvette", "Installation"];
const LABELS: Record<MissionDraft["type"], string> = {
  Transport: "Transport",
  Maillots: "Lavage maillots",
  Collation: "Collation",
  Buvette: "Buvette",
  Installation: "Installation salle",
};

type Draft = MissionDraft & { id?: string; inscrits?: number };

// "2026-10-18T13:00:00Z" -> { date: "2026-10-18", heure: "15:00" } en heure de Paris.
function parisParts(iso: string | null) {
  if (!iso) return { date: "", heure: "15:00" };
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", ...o }).format(new Date(iso));
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (k: string) => t.find((p) => p.type === k)?.value ?? "00";
  return { date: f({ year: "numeric", month: "2-digit", day: "2-digit" }), heure: `${get("hour")}:${get("minute")}` };
}
const stripJ = (s: string) => s.replace(/^J\d+\s*–\s*/, "");

// Création (sans `match`) ou modification (avec `match`) d'un match et de ses missions.
export function MatchSheet({ onClose, d, match }: { onClose: () => void; d?: TeamData; match?: Match }) {
  const editing = !!match && !!d;
  const init = parisParts(match?.date ?? null);
  const s = useSession();
  const refresh = useRefreshTeam();
  const navigate = useNavigate();
  const create = useServerFn(createMatch);
  const update = useServerFn(updateMatch);
  const del = useServerFn(deleteMatch);
  const [adversaire, setAdversaire] = useState(match?.adversaire ?? "");
  const [date, setDate] = useState(init.date);
  const [heure, setHeure] = useState(init.heure);
  const [lieu, setLieu] = useState<"Domicile" | "Extérieur">(match?.lieu === "Domicile" ? "Domicile" : "Extérieur");
  const [salle, setSalle] = useState(match?.salle ?? "");
  const [rdv, setRdv] = useState(match?.rdv ?? "");
  const [distance, setDistance] = useState(match?.distance ? String(match.distance) : "");
  const [missions, setMissions] = useState<Draft[]>(() =>
    editing
      ? missionsOf(d, match.id).map((m) => ({
          id: m.id,
          type: m.type as MissionDraft["type"],
          libelle: stripJ(m.libelle),
          places: m.places,
          detail: m.detail || undefined,
          inscrits: activeContribs(d, m.id).length,
        }))
      : defaultMissions("Extérieur", ""),
  );
  // En modification, on ne régénère jamais les missions automatiquement.
  const [touched, setTouched] = useState(editing);
  const [busy, setBusy] = useState(false);

  // Tant que le coach n'a pas modifié les missions, on les recalcule selon le lieu / l'adversaire.
  const reset = (l: typeof lieu, a: string) => !touched && setMissions(defaultMissions(l, a));
  const edit = (i: number, patch: Partial<Draft>) => {
    setTouched(true);
    setMissions(missions.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  };
  const remove = (i: number) => {
    setTouched(true);
    setMissions(missions.filter((_, j) => j !== i));
  };
  const add = (type: MissionDraft["type"]) => {
    setTouched(true);
    setMissions([...missions, { type, libelle: LABELS[type], places: 1 }]);
  };

  const submit = async () => {
    if (!adversaire.trim() || !date || !heure) {
      toast.error("Indiquez l'adversaire, la date et l'heure.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        code: s.code!,
        coachCode: s.coachCode!,
        adversaire: adversaire.trim(),
        date,
        heure,
        lieu,
        salle: (salle || (lieu === "Extérieur" ? adversaire : "")).trim() || undefined,
        rdv: rdv.trim() || undefined,
        distance: distance ? Math.min(2000, Math.max(0, Math.round(Number(distance)) || 0)) : undefined,
        infos: match?.infos || undefined,
      };
      const ms = missions.map(({ inscrits: _i, ...m }) => ({ ...m, libelle: m.libelle.trim() || LABELS[m.type] }));
      if (editing) {
        await update({ data: { ...payload, matchId: match.id, missions: ms } });
        await refresh();
        toast.success("Match mis à jour.");
        onClose();
      } else {
        const r = await create({ data: { ...payload, missions: ms } });
        await refresh();
        toast.success("Match créé ! Partagez-le sur WhatsApp pour lancer les inscriptions.");
        onClose();
        navigate({ to: "/matchs/$matchId", params: { matchId: r.id } });
      }
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible pour le moment.");
      if ((e as Error).message?.includes("coach")) s.logout();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!match || !confirm("Supprimer ce match et ses missions ? Cette action est définitive.")) return;
    setBusy(true);
    try {
      await del({ data: { code: s.code!, coachCode: s.coachCode!, matchId: match.id } });
      await refresh();
      toast.success("Match supprimé.");
      onClose();
      navigate({ to: "/matchs" });
    } catch (e) {
      toast.error((e as Error).message || "Suppression impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-primary/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">{editing ? "Modifier le match" : "Nouveau match"}</h2>
          <button onClick={onClose} className="-m-2 p-2 text-muted-foreground" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["Domicile", "Extérieur"] as const).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLieu(l);
                  reset(l, adversaire);
                }}
                className={`min-h-11 rounded-xl border-2 text-sm font-semibold ${lieu === l ? "border-accent bg-secondary" : "border-border"}`}
              >
                <span className="inline-flex items-center gap-2">
                  {l === "Domicile" ? <Home className="h-4 w-4" /> : <Bus className="h-4 w-4" />}
                  {l}
                </span>
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Adversaire</span>
            <input
              value={adversaire}
              onChange={(e) => {
                setAdversaire(e.target.value);
                reset(lieu, e.target.value);
              }}
              maxLength={60}
              placeholder="ex. Lorient"
              className={`mt-1 ${input}`}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-sm font-semibold">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${input}`} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Coup d'envoi</span>
              <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className={`mt-1 ${input}`} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Lieu / salle <span className="font-normal text-muted-foreground">(facultatif)</span></span>
            <input
              value={salle}
              onChange={(e) => setSalle(e.target.value)}
              maxLength={80}
              placeholder={lieu === "Domicile" ? "ex. Vannes – salle Kercado" : "ex. Quimper – salle de Penvillers"}
              className={`mt-1 ${input}`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Rendez-vous <span className="font-normal text-muted-foreground">(facultatif)</span></span>
            <input value={rdv} onChange={(e) => setRdv(e.target.value)} maxLength={80} placeholder="ex. 12h00 parking de la salle" className={`mt-1 ${input}`} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Distance aller-retour (km) <span className="font-normal text-muted-foreground">(facultatif)</span></span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={2000}
              value={distance}
              onChange={(e) => setDistance(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={lieu === "Extérieur" ? "ex. 240" : "ex. 0"}
              className={`mt-1 ${input}`}
            />
          </label>

          <div>
            <p className="text-sm font-semibold">Missions</p>
            <p className="text-xs text-muted-foreground">Proposées automatiquement, ajustez si besoin.</p>
            <ul className="mt-2 space-y-2">
              {missions.map((m, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl border border-border p-2">
                  <MissionIcon type={m.type} />
                  <input
                    value={m.libelle}
                    onChange={(e) => edit(i, { libelle: e.target.value })}
                    maxLength={80}
                    className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-sm font-semibold outline-none focus:bg-muted"
                  />
                  <button onClick={() => edit(i, { places: Math.max(1, m.places - 1) })} className="p-1 text-muted-foreground" aria-label="Moins">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{m.places}</span>
                  <button onClick={() => edit(i, { places: Math.min(10, m.places + 1) })} className="p-1 text-muted-foreground" aria-label="Plus">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    disabled={!!m.inscrits}
                    title={m.inscrits ? "Des personnes sont inscrites sur cette mission" : "Retirer"}
                    className="p-1 text-muted-foreground disabled:opacity-30"
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => (
                <button key={t} onClick={() => add(t)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
                  + {LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Btn variant="accent" className="w-full" loading={busy} onClick={submit}>
            {editing ? "Enregistrer" : "Créer le match"}
          </Btn>
          {editing && (
            <button onClick={onDelete} disabled={busy} className="block w-full py-2 text-center text-sm text-destructive underline">
              Supprimer ce match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
