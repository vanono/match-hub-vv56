import { useState, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Star, LayoutDashboard, ChevronRight, LogOut, ArrowLeft } from "lucide-react";
import { useSession, useTeamData, type Role } from "@/lib/session";
import { verifyCoachCode, verifyTeamCode } from "@/lib/vv56.functions";
import { Btn, Card, ErrorBox, Loading } from "./ui";
import { cn } from "@/lib/utils";

// `area` : profil requis pour la page ("famille", "coach" ou "both" pour les pages communes).
// Une page de l'autre espace redirige vers l'accueil de son propre espace.
export function AppShell({
  children,
  area = "both",
}: {
  children: ReactNode;
  area?: Role | "both";
}) {
  const s = useSession();
  const q = useTeamData();
  let body: ReactNode;
  if (!s.ready) body = <Loading />;
  else if (!s.code) body = <TeamCodeForm />;
  else if (q.isLoading) body = <Loading />;
  else if (q.error)
    body = <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  else if (s.role === "famille" && q.data && !q.data.personnes.some((p) => p.id === s.personneId))
    body = <RoleChooser />;
  else if (!s.role) body = <RoleChooser />;
  else if (area !== "both" && area !== s.role)
    body = <Navigate to={s.role === "coach" ? "/coach" : "/matchs"} replace />;
  else body = children;

  const loggedIn = s.ready && !!s.code && !!s.role;
  const coach = loggedIn && s.role === "coach";
  return (
    <div className="min-h-screen bg-background" data-espace={coach ? "coach" : "famille"}>
      <header className="sticky top-0 z-20 bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="shrink-0 whitespace-nowrap leading-tight">
            <span className="block font-display text-base font-bold">Vannes Volley 56</span>
            <span className="block text-xs text-primary-foreground/75">
              {coach ? "Espace coach" : "Espace famille"}
            </span>
          </Link>
          {loggedIn && <WhoAmI />}
        </div>
      </header>
      <main className={cn("mx-auto max-w-2xl px-4 pt-4", loggedIn ? "pb-28" : "pb-10")}>
        {body}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Données utilisées uniquement pour l'organisation de l'équipe – Vannes Volley 56
        </p>
      </main>
      {loggedIn && <TabBar role={s.role!} />}
    </div>
  );
}

function WhoAmI() {
  const s = useSession();
  const q = useTeamData();
  const label =
    s.role === "coach" ? "Coach" : q.data?.personnes.find((x) => x.id === s.personneId)?.nom;
  if (!label) return null;
  const logout = () => {
    if (confirm("Se déconnecter ? Vous reviendrez à l'écran d'accueil.")) s.logout();
  };
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-bold">
        {s.role === "coach" ? "🧑‍🏫 " : ""}
        {label}
      </span>
      <button
        onClick={logout}
        className="shrink-0 rounded-full p-2 text-primary-foreground/80 hover:bg-primary-foreground/15"
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function TabBar({ role }: { role: Role }) {
  const tabs =
    role === "coach"
      ? ([
          { to: "/coach", label: "Tableau de bord", Icon: LayoutDashboard },
          { to: "/matchs", label: "Matchs", Icon: CalendarDays },
        ] as const)
      : ([
          { to: "/matchs", label: "Matchs", Icon: CalendarDays },
          { to: "/engagements", label: "Mes engagements", Icon: Star },
        ] as const);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-2">
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
        Transport, maillots, collation… chaque coup de main fait vivre l'équipe. Entrez le code de
        votre équipe pour commencer.
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

// Étape 2 de l'accueil : choix explicite du profil.
function RoleChooser() {
  const s = useSession();
  const [step, setStep] = useState<"choix" | "famille" | "coach">("choix");
  if (step === "famille") return <PersonPicker onBack={() => setStep("choix")} />;
  if (step === "coach") return <CoachCodeForm onBack={() => setStep("choix")} />;
  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold">Qui êtes-vous ?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ce choix reste mémorisé sur cet appareil jusqu'à la déconnexion.
      </p>
      <div className="mt-5 space-y-3">
        <RoleButton
          emoji="👨‍👩‍👧"
          title="Je suis parent / joueur"
          text="Voir les matchs et donner un coup de main"
          onClick={() => setStep("famille")}
        />
        <RoleButton
          emoji="🧑‍🏫"
          title="Je suis coach"
          text="Organiser les matchs et suivre les missions"
          onClick={() => setStep("coach")}
        />
      </div>
      <button
        onClick={s.logout}
        className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground underline"
      >
        <LogOut className="h-4 w-4" /> Changer de code d'équipe
      </button>
    </div>
  );
}

function RoleButton({
  emoji,
  title,
  text,
  onClick,
}: {
  emoji: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 text-left shadow-card transition active:scale-[0.99]"
    >
      <span className="text-3xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Retour
    </button>
  );
}

function PersonPicker({ onBack }: { onBack: () => void }) {
  const s = useSession();
  const q = useTeamData();
  const list = (q.data?.personnes ?? [])
    .filter((p) => p.actif && p.profil !== "Coach")
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return (
    <div>
      <BackLink onClick={onBack} />
      <h1 className="mt-2 text-2xl font-bold">Je suis…</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choisissez votre nom.</p>
      <div className="mt-4 space-y-2">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => s.loginFamille(p.id)}
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
    </div>
  );
}

function CoachCodeForm({ onBack }: { onBack: () => void }) {
  const s = useSession();
  const verify = useServerFn(verifyCoachCode);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const r = await verify({ data: { code: s.code!, coachCode: code } });
      if (r.ok) s.loginCoach(code.trim());
      else setErr("Code coach incorrect.");
    } catch {
      setErr("Vérification impossible pour le moment. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <BackLink onClick={onBack} />
      <h1 className="mt-2 text-2xl font-bold">Espace coach</h1>
      <p className="mt-1 text-sm text-muted-foreground">Réservé au coach de l'équipe.</p>
      <Card className="mt-4">
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code coach"
            autoFocus
            className="h-14 w-full rounded-xl border-2 border-input bg-background px-4 text-lg outline-none focus:border-ring"
          />
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Btn type="submit" loading={busy} className="w-full">
            Accéder
          </Btn>
        </form>
      </Card>
    </div>
  );
}
