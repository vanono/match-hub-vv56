import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { Btn } from "./ui";
import { useRefreshTeam, useSession } from "@/lib/session";
import { createMatch } from "@/lib/vv56.functions";
import { defaultMissions, typeEmoji, type MissionDraft } from "@/lib/vv56-types";

const input = "h-12 w-full rounded-xl border-2 border-input bg-background px-3 outline-none focus:border-ring";
const ALL_TYPES: MissionDraft["type"][] = ["Transport", "Maillots", "Collation", "Buvette", "Installation"];
const LABELS: Record<MissionDraft["type"], string> = {
  Transport: "Transport",
  Maillots: "Lavage maillots",
  Collation: "Collation",
  Buvette: "Buvette",
  Installation: "Installation salle",
};

export function NewMatchSheet({ onClose }: { onClose: () => void }) {
  const s = useSession();
  const refresh = useRefreshTeam();
  const navigate = useNavigate();
  const create = useServerFn(createMatch);
  const [adversaire, setAdversaire] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("15:00");
  const [lieu, setLieu] = useState<"Domicile" | "Extérieur">("Extérieur");
  const [salle, setSalle] = useState("");
  const [rdv, setRdv] = useState("");
  const [missions, setMissions] = useState<MissionDraft[]>(defaultMissions("Extérieur", ""));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Tant que le coach n'a pas modifié les missions, on les recalcule selon le lieu / l'adversaire.
  const reset = (l: typeof lieu, a: string) => !touched && setMissions(defaultMissions(l, a));
  const edit = (i: number, patch: Partial<MissionDraft>) => {
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
      const r = await create({
        data: {
          code: s.code!,
          coachCode: s.coachCode!,
          adversaire: adversaire.trim(),
          date,
          heure,
          lieu,
          salle: (salle || (lieu === "Extérieur" ? adversaire : "")).trim() || undefined,
          rdv: rdv.trim() || undefined,
          missions: missions.map((m) => ({ ...m, libelle: m.libelle.trim() || LABELS[m.type] })),
        },
      });
      await refresh();
      toast.success("Match créé ! Partagez-le sur WhatsApp pour lancer les inscriptions.");
      onClose();
      navigate({ to: "/matchs/$matchId", params: { matchId: r.id } });
    } catch (e) {
      toast.error((e as Error).message || "Création impossible pour le moment.");
      if ((e as Error).message?.includes("coach")) s.setCoachCode(null);
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
          <h2 className="text-xl font-bold">Nouveau match</h2>
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
                {l === "Domicile" ? "🏠 Domicile" : "🚌 Extérieur"}
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

          <div>
            <p className="text-sm font-semibold">Missions</p>
            <p className="text-xs text-muted-foreground">Proposées automatiquement, ajustez si besoin.</p>
            <ul className="mt-2 space-y-2">
              {missions.map((m, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl border border-border p-2">
                  <span className="text-lg">{typeEmoji[m.type]}</span>
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
                  <button onClick={() => remove(i)} className="p-1 text-muted-foreground" aria-label="Retirer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => (
                <button key={t} onClick={() => add(t)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
                  + {typeEmoji[t]} {LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Btn variant="accent" className="w-full" loading={busy} onClick={submit}>
            Créer le match
          </Btn>
        </div>
      </div>
    </div>
  );
}
