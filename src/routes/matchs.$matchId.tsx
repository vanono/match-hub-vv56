import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, MapPin, Route as RouteIcon, Info, Share2, X, Pencil } from "lucide-react";
import { MatchSheet } from "@/components/vv56/MatchSheet";
import { AppShell } from "@/components/vv56/AppShell";
import { CoverageBadge } from "@/components/vv56/MatchCard";
import { Btn, Card, Empty, Pill, Progress } from "@/components/vv56/ui";
import { useRefreshTeam, useSession, useTeamData } from "@/lib/session";
import { cancelContribution, signUp } from "@/lib/vv56.functions";
import {
  activeContribs,
  couverture,
  fmtDate,
  fmtTime,
  missionsOf,
  typeEmoji,
  whatsappLink,
  type Mission,
  type TeamData,
} from "@/lib/vv56-types";

export const Route = createFileRoute("/matchs/$matchId")({
  head: () => ({
    meta: [
      { title: "Fiche match · VV56 Espace équipe" },
      { name: "description", content: "Infos pratiques du match et missions à prendre en charge." },
      { property: "og:title", content: "Un coup de main pour le prochain match ? · VV56" },
      { property: "og:description", content: "Transport, maillots, collation : inscrivez-vous en quelques secondes." },
    ],
  }),
  component: () => (
    <AppShell>
      <MatchPage />
    </AppShell>
  ),
});

function MatchPage() {
  const { matchId } = Route.useParams();
  const { data } = useTeamData();
  const s = useSession();
  const [signing, setSigning] = useState<Mission | null>(null);
  const [editing, setEditing] = useState(false);
  if (!data) return null;
  const match = data.matchs.find((m) => m.id === matchId);
  if (!match) return <Empty emoji="🤔" title="Ce match est introuvable" text="Il a peut-être été retiré du calendrier." />;
  const missions = missionsOf(data, match.id);
  const dom = match.lieu === "Domicile";
  const share = () => window.open(whatsappLink(data, match, window.location.origin), "_blank");

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link to="/matchs" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Matchs
        </Link>
        {s.role === "coach" && (
          <button onClick={() => setEditing(true)} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-foreground">
            <Pencil className="h-4 w-4" /> Modifier le match
          </button>
        )}
      </div>
      <div className="mt-2 rounded-2xl bg-hero p-5 text-primary-foreground shadow-card">
        <p className="text-sm capitalize text-primary-foreground/80">{fmtDate(match.date)}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {dom ? `VV56 vs ${match.adversaire}` : `${match.adversaire} vs VV56`}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">{dom ? "🏠 Domicile" : "🚌 Extérieur"}</span>
          <CoverageBadge d={data} match={match} />
        </div>
      </div>

      <Card className="mt-4 space-y-3 text-sm">
        {match.date && <Row icon={<Clock className="h-4 w-4" />} label="Coup d'envoi" value={fmtTime(match.date)} />}
        {match.rdv && <Row icon={<Clock className="h-4 w-4" />} label="Rendez-vous" value={match.rdv} />}
        {match.salle && <Row icon={<MapPin className="h-4 w-4" />} label="Lieu" value={match.salle} />}
        {!!match.distance && <Row icon={<RouteIcon className="h-4 w-4" />} label="Distance A/R" value={`${match.distance} km`} />}
        {match.infos && <Row icon={<Info className="h-4 w-4" />} label="Infos" value={match.infos} />}
      </Card>

      <Btn variant="whatsapp" className="mt-4 w-full" onClick={share}>
        <Share2 className="h-5 w-5" /> Partager sur WhatsApp
      </Btn>

      <h2 className="mt-8 text-xl font-bold">Missions</h2>
      <div className="mt-3 space-y-3">
        {missions.length === 0 ? (
          <Empty emoji="🙌" title="Aucune mission pour ce match" text="Rien à organiser, profitez du match !" />
        ) : (
          missions.map((m) => <MissionCard key={m.id} d={data} m={m} onSign={() => setSigning(m)} />)
        )}
      </div>
      {editing && <MatchSheet d={data} match={match} onClose={() => setEditing(false)} />}
      {signing && <SignSheet d={data} mission={signing} onClose={() => setSigning(null)} />}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-accent-foreground/60">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-medium whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}

function MissionCard({ d, m, onSign }: { d: TeamData; m: Mission; onSign: () => void }) {
  const s = useSession();
  const refresh = useRefreshTeam();
  const cancel = useServerFn(cancelContribution);
  const [busy, setBusy] = useState(false);
  const c = couverture(d, m);
  const inscrits = activeContribs(d, m.id);
  const mine = inscrits.find((x) => x.personneId === s.personneId);
  const name = (id: string) => d.personnes.find((p) => p.id === id)?.nom ?? "Quelqu'un";
  const onCancel = async () => {
    if (!mine || !confirm("Annuler votre inscription ? Pas de souci, ça arrive !")) return;
    setBusy(true);
    try {
      await cancel({ data: { code: s.code!, contributionId: mine.id, personneId: s.personneId! } });
      toast("Inscription annulée. Merci d'avoir prévenu 👍");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Annulation impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold">
            {typeEmoji[m.type] ?? "•"} {m.libelle}
          </p>
          {m.detail && <p className="mt-0.5 text-sm text-muted-foreground">{m.detail}</p>}
        </div>
        {c.etat === "Couverte" ? <Pill tone="success">Couvert ✓</Pill> : c.etat === "Partielle" ? <Pill tone="warning">Partiel</Pill> : <Pill tone="warning">À pourvoir</Pill>}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={c.inscrits} max={m.places} tone={c.etat === "Couverte" ? "success" : c.inscrits ? "accent" : "warning"} />
        <span className="shrink-0 text-sm font-bold">
          {c.inscrits} / {m.places}
        </span>
      </div>
      {inscrits.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {inscrits.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold">{name(x.personneId)}</span>
                {x.realisePar && <span className="text-muted-foreground"> · {x.realisePar}</span>}
                {x.placesVoiture ? <span className="text-muted-foreground"> · {x.placesVoiture} places</span> : null}
              </span>
              {x.statut === "Réalisé" && <Pill tone="success">Réalisé</Pill>}
            </li>
          ))}
        </ul>
      )}
      {s.role !== "coach" && (
        <div className="mt-4">
        {mine ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-success-soft p-3">
            <span className="text-sm font-semibold text-success-foreground">Vous êtes inscrit·e, merci ! 🙌</span>
            {mine.statut === "Inscrit" && (
              <button onClick={onCancel} disabled={busy} className="min-h-10 shrink-0 px-2 text-sm text-muted-foreground underline">
                {busy ? "…" : "Annuler"}
              </button>
            )}
          </div>
        ) : c.etat === "Couverte" ? (
          <p className="text-center text-sm text-muted-foreground">Mission couverte, merci à tous !</p>
        ) : (
          <Btn variant="accent" className="w-full" onClick={onSign}>
            Je m'en occupe
          </Btn>
        )}
        </div>
      )}
    </Card>
  );
}

function SignSheet({ d, mission, onClose }: { d: TeamData; mission: Mission; onClose: () => void }) {
  const s = useSession();
  const refresh = useRefreshTeam();
  const sign = useServerFn(signUp);
  const me = d.personnes.find((p) => p.id === s.personneId);
  const isFamily = me?.profil?.startsWith("Famille");
  const isTransport = mission.type === "Transport";
  const [who, setWho] = useState(isFamily ? "" : "Moi");
  const [places, setPlaces] = useState(4);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (isTransport && !who.trim()) {
      toast.error("Indiquez qui conduit.");
      return;
    }
    setBusy(true);
    try {
      await sign({
        data: {
          code: s.code!,
          missionId: mission.id,
          personneId: s.personneId!,
          realisePar: who.trim() || undefined,
          placesVoiture: isTransport ? places : undefined,
        },
      });
      await refresh();
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message || "Inscription impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-primary/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-card sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="py-6 text-center">
            <div className="text-6xl">🙌</div>
            <h2 className="mt-3 text-2xl font-bold">Merci !</h2>
            <p className="mt-2 text-muted-foreground">Grâce à vous, l'équipe est un peu plus prête pour ce match. C'est noté !</p>
            <Btn className="mt-6 w-full" onClick={onClose}>
              Super
            </Btn>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold">
                {typeEmoji[mission.type]} {mission.libelle}
              </h2>
              <button onClick={onClose} className="-m-2 p-2 text-muted-foreground" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">{isTransport ? "Qui conduit ?" : "Qui s'en charge ?"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(isFamily ? ["Papa", "Maman"] : ["Moi"]).map((o) => (
                    <button
                      key={o}
                      onClick={() => setWho(o)}
                      className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${who === o ? "border-accent bg-secondary" : "border-border"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <input
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  maxLength={60}
                  placeholder="ou un prénom (ex. Mamie)"
                  className="mt-2 h-12 w-full rounded-xl border-2 border-input bg-background px-3 outline-none focus:border-ring"
                />
              </div>
              {isTransport && (
                <div>
                  <p className="text-sm font-semibold">Places disponibles dans la voiture (enfants)</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Btn variant="outline" className="w-12 px-0" onClick={() => setPlaces(Math.max(1, places - 1))}>−</Btn>
                    <span className="w-8 text-center text-2xl font-bold">{places}</span>
                    <Btn variant="outline" className="w-12 px-0" onClick={() => setPlaces(Math.min(9, places + 1))}>+</Btn>
                  </div>
                </div>
              )}
              <Btn variant="accent" className="w-full" loading={busy} onClick={submit}>
                Je confirme
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
