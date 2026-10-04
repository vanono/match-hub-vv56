import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/vv56/AppShell";
import { Card, Empty, Pill, Progress } from "@/components/vv56/ui";
import { useSession, useTeamData } from "@/lib/session";
import { teamCoverage, fmtShort, typeEmoji, type TeamData } from "@/lib/vv56-types";

export const Route = createFileRoute("/engagements")({
  head: () => ({
    meta: [
      { title: "Mes engagements · VV56 Espace équipe" },
      { name: "description", content: "Votre participation à la vie de l'équipe, vos badges et l'élan collectif." },
      { property: "og:title", content: "Mes engagements · VV56" },
      { property: "og:description", content: "Suivez vos coups de main et la couverture des missions de l'équipe." },
    ],
  }),
  component: () => (
    <AppShell>
      <Engagements />
    </AppShell>
  ),
});

function Engagements() {
  const { data: d } = useTeamData();
  const { personneId } = useSession();
  if (!d) return null;
  const me = d.personnes.find((p) => p.id === personneId)!;
  const mine = d.contributions.filter((c) => c.personneId === personneId && c.statut !== "Annulé");
  const missionOf = (id: string) => d.missions.find((m) => m.id === id);
  const count = (t: string) => mine.filter((c) => missionOf(c.missionId)?.type === t).length;
  const goals = [
    { t: "Transport", label: "Transports", n: count("Transport"), max: d.team.objectifs.Transport },
    { t: "Maillots", label: "Maillots", n: count("Maillots"), max: d.team.objectifs.Maillots },
    { t: "Collation", label: "Collations", n: count("Collation"), max: d.team.objectifs.Collation },
  ];
  const allGoals = goals.every((g) => g.n >= g.max);
  const badges = [
    { ok: mine.length >= 1, e: "🌱", l: "Premier coup de main" },
    { ok: count("Transport") >= 1, e: "🚗", l: "Premier transport" },
    { ok: count("Maillots") >= 1, e: "👕", l: "Maillots tout propres" },
    { ok: count("Collation") >= 1, e: "🍎", l: "Chef collation" },
    { ok: mine.length >= 5, e: "⭐", l: "Pilier de l'équipe" },
    { ok: allGoals, e: "🏆", l: "Objectif atteint" },
  ];
  const cov = teamCoverage(d);
  const hist = [...mine]
    .map((c) => ({ c, m: missionOf(c.missionId), match: d.matchs.find((x) => x.id === missionOf(c.missionId)?.matchId) }))
    .sort((a, b) => (b.match?.date ?? "").localeCompare(a.match?.date ?? ""));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Mes engagements</h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.nom} · saison {d.team.saison}</p>
      </div>

      <Card className="bg-hero text-primary-foreground">
        <p className="text-sm text-primary-foreground/80">Ensemble, l'équipe a couvert</p>
        <p className="font-display text-4xl font-extrabold">{cov.pct}%</p>
        <p className="text-sm text-primary-foreground/80">des missions de la saison ({cov.covered} / {cov.total})</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full rounded-full bg-accent" style={{ width: `${cov.pct}%` }} />
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Ma progression</h2>
        <p className="text-xs text-muted-foreground">Repères proposés par l'équipe pour la saison</p>
        <div className="mt-4 space-y-4">
          {goals.map((g) => (
            <div key={g.t}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">{typeEmoji[g.t]} {g.label}</span>
                <span className="font-bold">
                  {g.n} / {g.max} {g.n >= g.max && g.max > 0 && "✓"}
                </span>
              </div>
              <Progress value={g.n} max={g.max} tone={g.n >= g.max ? "success" : "accent"} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Mes badges</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {badges.map((b) => (
            <div key={b.l} className={`rounded-xl p-3 text-center ${b.ok ? "bg-secondary" : "bg-muted opacity-50 grayscale"}`}>
              <div className="text-2xl">{b.e}</div>
              <p className="mt-1 text-[11px] font-semibold leading-tight">{b.l}</p>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="font-bold">Historique</h2>
        <div className="mt-3 space-y-2">
          {hist.length === 0 ? (
            <Empty emoji="✨" title="Votre première mission vous attend" text="Jetez un œil aux prochains matchs, il y a sûrement un coup de main facile à donner." />
          ) : (
            hist.map(({ c, m, match }) => (
              <Link key={c.id} to="/matchs/$matchId" params={{ matchId: match?.id ?? "" }} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{typeEmoji[m?.type ?? ""]} {m?.libelle}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtShort(match?.date ?? null)}{c.realisePar && ` · ${c.realisePar}`}
                  </p>
                </div>
                <Pill tone={c.statut === "Réalisé" ? "success" : "info"}>{c.statut}</Pill>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
