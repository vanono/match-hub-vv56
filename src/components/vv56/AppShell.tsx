import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Star, ClipboardList, ChevronRight, LogOut } from "lucide-react";
import { useSession, useTeamData } from "@/lib/session";
import { verifyTeamCode } from "@/lib/vv56.functions";
import { Btn, Card, ErrorBox, Loading } from "./ui";
import { cn } from "@/lib/utils";

export function AppShell({ children, needPerson = true }: { children: ReactNode; needPerson?: boolean }) {
  const s = useSession();
  const q = useTeamData();
  let body: ReactNode;
  if (!s.ready) body = <Loading />;
  else if (!s.code) body = <TeamCodeForm />;
  else if (q.isLoading) body = <Loading />;
  else if (q.error) body = <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  else if (needPerson && q.data && !q.data.personnes.some((p) => p.id === s.personneId)) body = <PersonPicker />;
  else body = children;

  const showTabs = s.ready && !!s.code && !!s.personneId;
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="leading-tight">
            <span className="block font-display text-base font-bold">Vannes Volley 56</span>
            <span className="block text-xs text-primary-foreground/75">Espace équipe</span>
          </Link>
          {showTabs && <WhoAmI />}
        </div>
      </header>
      <main className={cn("mx-auto max-w-2xl px-4 pt-4", showTabs ? "pb-28" : "pb-10")}>
        {body}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Données utilisées uniquement pour l'organisation de l'équipe – Vannes Volley 56
        </p>
      </main>
      {showTabs && <TabBar />}
    </div>
  );
}

function WhoAmI() {
  const s = useSession();
  const q = useTeamData();
  const p = q.data?.personnes.find((x) => x.id === s.personneId);
  if (!p) return null;
  return (
    <button
      onClick={() => s.setPersonne(null)}
      className="max-w-[55%] truncate rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold"
      title="Changer de personne"
    >
      {p.nom} · changer
    </button>
  );
}

function TabBar() {
  const tabs = [
    { to: "/matchs", label: "Matchs", Icon: CalendarDays },
    { to: "/engagements", label: "Mes engagements", Icon: Star },
    { to: "/coach", label: "Coach", Icon: ClipboardList },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-3">
        {tabs.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary [&>span:first-child]:bg-secondary" }}
          >
            <span className="rounded-full px-4 py-1">
              <Icon className="h-5 w-5" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function TeamCodeForm() {
  const s = useSession();
  const verify = useServerFn(verifyTeamCode);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setErr("Saisissez le code transmis par le coach.");
    setLoading(true);
    setErr("");
    try {
      const r = await verify({ data: { code } });
      if (r.ok) s.setCode(code.trim().toUpperCase());
      else setErr("Ce code ne correspond à aucune équipe. Vérifiez auprès du coach.");
    } catch {
      setErr("Connexion impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pt-6">
      <h1 className="text-3xl font-bold">Bienvenue ! 🏐</h1>
      <p className="mt-2 text-muted-foreground">
        Transport, maillots, collation… chaque coup de main fait vivre l'équipe. Entrez le code de votre équipe pour commencer.
      </p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Code d'équipe</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ex. VV56"
              className="mt-1 h-14 w-full rounded-xl border-2 border-input bg-background px-4 text-lg font-bold uppercase tracking-widest outline-none focus:border-ring"
            />
          </label>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Btn type="submit" loading={loading} className="w-full">
            Entrer
          </Btn>
        </form>
      </Card>
    </div>
  );
}

function PersonPicker() {
  const s = useSession();
  const q = useTeamData();
  const list = (q.data?.personnes ?? []).filter((p) => p.actif && p.profil !== "Coach").sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return (
    <div className="pt-2">
      <h1 className="text-2xl font-bold">Je suis…</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choisissez votre nom. Ce choix reste mémorisé sur cet appareil, et vous pourrez le changer à tout moment.</p>
      <div className="mt-4 space-y-2">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => s.setPersonne(p.id)}
            className="flex min-h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left shadow-card transition active:scale-[0.99]"
          >
            <span>
              <span className="block font-semibold">{p.nom}</span>
              <span className="block text-xs text-muted-foreground">{p.profil}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
      <button onClick={() => s.setCode(null)} className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground underline">
        <LogOut className="h-4 w-4" /> Changer de code d'équipe
      </button>
    </div>
  );
}
