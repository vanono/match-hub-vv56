import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/vv56/AppShell";
import { MatchCard } from "@/components/vv56/MatchCard";
import { Empty } from "@/components/vv56/ui";
import { useTeamData } from "@/lib/session";
import { isPast, sortMatchs } from "@/lib/vv56-types";

export const Route = createFileRoute("/matchs/")({
  head: () => ({
    meta: [
      { title: "Matchs · VV56 Espace équipe" },
      { name: "description", content: "Les prochains matchs de l'équipe et les coups de main attendus." },
      { property: "og:title", content: "Matchs · VV56 Espace équipe" },
      { property: "og:description", content: "Les prochains matchs et les missions à pourvoir." },
    ],
  }),
  component: () => (
    <AppShell>
      <MatchsPage />
    </AppShell>
  ),
});

function MatchsPage() {
  const { data } = useTeamData();
  const [showPast, setShowPast] = useState(false);
  if (!data) return null;
  const all = sortMatchs(data.matchs);
  const next = all.filter((m) => !isPast(m));
  const past = all.filter(isPast).reverse();
  return (
    <div>
      <h1 className="text-2xl font-bold">Prochains matchs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Un coup de main, même petit, fait toute la différence 💙</p>
      <div className="mt-4 space-y-3">
        {next.length === 0 ? (
          <Empty emoji="📅" title="Aucun match à venir pour l'instant" text="Le calendrier sera bientôt mis à jour." />
        ) : (
          next.map((m) => <MatchCard key={m.id} d={data} match={m} />)
        )}
      </div>
      {past.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowPast(!showPast)} className="flex min-h-12 w-full items-center justify-between font-semibold text-muted-foreground">
            Matchs passés ({past.length})
            <ChevronDown className={`h-5 w-5 transition ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast && <div className="space-y-3">{past.map((m) => <MatchCard key={m.id} d={data} match={m} muted />)}</div>}
        </div>
      )}
      <div className="mt-8 text-center">
        <Link to="/coach" className="text-sm text-muted-foreground underline">
          Espace coach
        </Link>
      </div>
    </div>
  );
}
