import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTeamData } from "./vv56.functions";

export type Role = "famille" | "coach";

// Un seul profil actif à la fois : famille (avec une personne choisie) OU coach (avec le code coach).
// Passer de l'un à l'autre impose une déconnexion explicite.
type Session = {
  ready: boolean;
  code: string | null;
  role: Role | null;
  personneId: string | null;
  coachCode: string | null;
  setCode: (c: string) => void;
  loginFamille: (personneId: string) => void;
  loginCoach: (coachCode: string) => void;
  logout: () => void;
};

const Ctx = createContext<Session | null>(null);
const K = { code: "vv56.code", personne: "vv56.personne", coach: "vv56.coach" };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [code, setCodeS] = useState<string | null>(null);
  const [personneId, setP] = useState<string | null>(null);
  const [coachCode, setC] = useState<string | null>(null);
  const persist = (k: string, v: string | null) =>
    v ? localStorage.setItem(k, v) : localStorage.removeItem(k);
  useEffect(() => {
    const p = localStorage.getItem(K.personne);
    const c = localStorage.getItem(K.coach);
    setCodeS(localStorage.getItem(K.code));
    // Ancienne session mêlant famille + coach : on garde la famille, le coach devra se reconnecter.
    setP(p);
    setC(p ? null : c);
    if (p && c) persist(K.coach, null);
    setReady(true);
  }, []);
  const role: Role | null = coachCode ? "coach" : personneId ? "famille" : null;
  const logout = () => {
    for (const k of Object.values(K)) persist(k, null);
    setCodeS(null);
    setP(null);
    setC(null);
  };
  return (
    <Ctx.Provider
      value={{
        ready,
        code,
        role,
        personneId,
        coachCode,
        setCode: (c) => {
          persist(K.code, c);
          setCodeS(c);
        },
        loginFamille: (id) => {
          persist(K.coach, null);
          setC(null);
          persist(K.personne, id);
          setP(id);
        },
        loginCoach: (c) => {
          persist(K.personne, null);
          setP(null);
          persist(K.coach, c);
          setC(c);
        },
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("SessionProvider manquant");
  return s;
}

export function useTeamData() {
  const { code } = useSession();
  const fetchData = useServerFn(getTeamData);
  return useQuery({
    queryKey: ["team", code],
    queryFn: () => fetchData({ data: { code: code! } }),
    enabled: !!code,
    staleTime: 20_000,
  });
}

export function useRefreshTeam() {
  const qc = useQueryClient();
  const { code } = useSession();
  return () => qc.invalidateQueries({ queryKey: ["team", code] });
}
