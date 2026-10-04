import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { besoinsMatch, fmtShort, fmtTime, missionsOf, type Match, type TeamData } from "@/lib/vv56-types";
import { Pill } from "./ui";

export function CoverageBadge({ d, match }: { d: TeamData; match: Match }) {
  const total = missionsOf(d, match.id).length;
  const n = besoinsMatch(d, match.id).length;
  if (total === 0) return <Pill tone="muted">Pas de mission</Pill>;
  if (n === 0) return <Pill tone="success">Tout est couvert ✓</Pill>;
  return <Pill tone="warning">{n} besoin{n > 1 ? "s" : ""} à pourvoir</Pill>;
}

export function MatchCard({ d, match, muted }: { d: TeamData; match: Match; muted?: boolean }) {
  const dom = match.lieu === "Domicile";
  return (
    <Link
      to="/matchs/$matchId"
      params={{ matchId: match.id }}
      className={`block rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99] ${muted ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-foreground/70">
            {fmtShort(match.date)} {match.date && `· ${fmtTime(match.date)}`}
          </p>
          <p className="mt-1 truncate font-display text-lg font-bold">
            {dom ? "VV56 vs " : ""}
            {match.adversaire}
            {dom ? "" : " vs VV56"}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {dom ? "Domicile" : "Extérieur"}
            {match.salle && ` · ${match.salle}`}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <CoverageBadge d={d} match={match} />
      </div>
    </Link>
  );
}
