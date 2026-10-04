import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { AppShell } from "@/components/vv56/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VV56 – Espace équipe · Vannes Volley 56" },
      { name: "description", content: "Inscrivez-vous en quelques secondes aux missions des matchs du Vannes Volley 56." },
      { property: "og:title", content: "VV56 – Espace équipe" },
      { property: "og:description", content: "Transport, maillots, collation : un coup de main en 10 secondes pour l'équipe." },
    ],
  }),
  component: () => (
    <AppShell>
      <Home />
    </AppShell>
  ),
});

function Home() {
  const { role } = useSession();
  return <Navigate to={role === "coach" ? "/coach" : "/matchs"} replace />;
}
