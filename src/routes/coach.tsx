import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Share2, CheckCircle2, CalendarPlus, PartyPopper, ClipboardCheck } from "lucide-react";
import { MissionIcon } from "@/components/vv56/MissionIcon";
import { MatchSheet } from "@/components/vv56/MatchSheet";
import { AppShell } from "@/components/vv56/AppShell";
import { Btn, Card, Empty, Pill } from "@/components/vv56/ui";
import { useRefreshTeam, useSession, useTeamData } from "@/lib/session";
import { markDone } from "@/lib/vv56.functions";
import { besoinsMatch, couverture, fmtShort, isPast, sortMatchs, teamCoverage, missionLabel, shortName, whatsappLink, type TeamData } from "@/lib/vv56-types";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Espace coach · VV56 Espace équipe" },
      { name: "description", content: "Besoins non couverts, répartition des contributions et suivi des missions." },
      { property: "og:title", content: "Espace coach · VV56" },
      { property: "og:description", content: "Le tableau de bord du coach du Vannes Volley 56." },
    ],
  }),
  component: () => (
    <AppShell area="coach">
      <CoachDashboard />
    </AppShell>
  ),
});

function CoachDashboard() {
  const { data: d } = useTeamData();
  const s = useSession();
  const [creating, setCreating] = useState(false);
  if (!d) return null;
  const cov = teamCoverage(d);
  const familles = d.personnes.filter((p) => p.actif && p.profil !== "Coach");
  const counts = familles
    .map((p) => ({ p, n: d.contributions.filter((c) => c.personneId === p.id && c.statut !== "Annulé").length }))
    .sort((a, b) => b.n - a.n || a.p.nom.localeCompare(b.p.nom, "fr"));
  const contributed = counts.filter((c) => c.n > 0).length;
  const zero = counts.filter((c) => c.n === 0);
  const max = Math.max(1, ...counts.map((c) => c.n));
  const upcoming = sortMatchs(d.matchs).filter((m) => !isPast(m));
  const needs = upcoming.filter((m) => besoinsMatch(d, m.id).length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <Btn variant="accent" className="w-full" onClick={() => setCreating(true)}>
        <CalendarPlus className="h-5 w-5" /> Créer un match
      </Btn>
      {creating && <MatchSheet onClose={() => setCreating(false)} />}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-semibold text-muted-foreground">Taux de couverture</p>
          <p className="font-display text-3xl font-bold">{cov.pct}%</p>
          <p className="text-xs text-muted-foreground">{cov.covered} / {cov.total} missions</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-muted-foreground">Joueuses ayant contribué</p>
          <p className="font-display text-3xl font-bold">{contributed} / {familles.length}</p>
          <p className="text-xs text-muted-foreground">sur la saison</p>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-bold">Besoins non couverts</h2>
        <div className="mt-3 space-y-3">
          {needs.length === 0 ? (
            <Empty icon={PartyPopper} title="Tout est couvert pour les prochains matchs" text="Bravo à toute l'équipe !" />
          ) : (
            needs.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to="/matchs/$matchId" params={{ matchId: m.id }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fmtShort(m.date)}</p>
                    <p className="font-display font-semibold">{missionLabel(m.intitule) || m.adversaire}</p>
                  </Link>
                  <Btn variant="whatsapp" className="min-h-10 px-3 text-sm" onClick={() => window.open(whatsappLink(d, m, window.location.origin), "_blank")}>
                    <Share2 className="h-4 w-4" /> Relancer
                  </Btn>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {besoinsMatch(d, m.id).map((mi) => {
                    const c = couverture(d, mi);
                    return (
                      <li key={mi.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <MissionIcon type={mi.type} className="h-6 w-6 rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5" />
                          {missionLabel(mi.libelle)}
                        </span>
                        <Pill tone="warning">{c.inscrits}/{mi.places}</Pill>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">Répartition des contributions</h2>
        <Card className="mt-3 space-y-2.5">
          {counts.map(({ p, n }) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className={`w-36 shrink-0 truncate ${n === 0 ? "font-medium text-warning-foreground" : ""}`}>{shortName(p.nom)}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
                <div className="h-full rounded-md bg-accent" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-5 text-right font-semibold tabular-nums">{n}</span>
            </div>
          ))}
        </Card>
        {zero.length > 0 && (
          <div className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-foreground">
            <b>{zero.length} joueuse{zero.length > 1 ? "s n'ont" : " n'a"} pas encore eu l'occasion de participer.</b> Une petite
            invitation personnelle (une collation, un lavage de maillots) est souvent la meilleure porte d'entrée.
          </div>
        )}
      </section>

      <ToValidate d={d} />
    </div>
  );
}

function ToValidate({ d }: { d: TeamData }) {
  const s = useSession();
  const refresh = useRefreshTeam();
  const mark = useServerFn(markDone);
  const [busy, setBusy] = useState<string | null>(null);
  const items = d.contributions
    .filter((c) => c.statut === "Inscrit")
    .map((c) => {
      const m = d.missions.find((x) => x.id === c.missionId);
      return { c, m, match: d.matchs.find((x) => x.id === m?.matchId) };
    })
    .sort((a, b) => (a.match?.date ?? "").localeCompare(b.match?.date ?? ""));
  const go = async (id: string) => {
    setBusy(id);
    try {
      await mark({ data: { code: s.code!, coachCode: s.coachCode!, contributionId: id } });
      toast.success("Marqué comme réalisé, merci à eux !");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
      if ((e as Error).message.includes("coach")) s.logout();
    } finally {
      setBusy(null);
    }
  };
  return (
    <section>
      <h2 className="text-lg font-bold">Valider les missions réalisées</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <Empty icon={ClipboardCheck} title="Rien à valider" />
        ) : (
          items.map(({ c, m, match }) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{shortName(d.personnes.find((p) => p.id === c.personneId)?.nom ?? "")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtShort(match?.date ?? null)} · {missionLabel(m?.libelle ?? "")}
                  {c.realisePar && ` · ${c.realisePar}`}
                </p>
              </div>
              <Btn variant="outline" className="min-h-10 shrink-0 px-3 text-sm" loading={busy === c.id} onClick={() => go(c.id)}>
                <CheckCircle2 className="h-4 w-4" /> Réalisé
              </Btn>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
