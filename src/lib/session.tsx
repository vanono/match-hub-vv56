import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTeamData } from "./vv56.functions";

type Session = {
  ready: boolean;
  code: string | null;
  personneId: string | null;
  coachCode: string | null;
  setCode: (c: string | null) => void;
  setPersonne: (id: string | null) => void;
  setCoachCode: (c: string | null) => void;
};

const Ctx = createContext<Session | null>(null);
const K = { code: "vv56.code", personne: "vv56.personne", coach: "vv56.coach" };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [code, setCodeS] = useState<string | null>(null);
  const [personneId, setP] = useState<string | null>(null);
  const [coachCode, setC] = useState<string | null>(null);
  useEffect(() => {
    setCodeS(localStorage.getItem(K.code));
    setP(localStorage.getItem(K.personne));
    setC(localStorage.getItem(K.coach));
    setReady(true);
  }, []);
  const persist = (k: string, v: string | null) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));
  return (
    <Ctx.Provider
      value={{
        ready,
        code,
        personneId,
        coachCode,
        setCode: (c) => {
          persist(K.code, c);
          setCodeS(c);
          if (!c) {
            persist(K.personne, null);
            persist(K.coach, null);
            setP(null);
            setC(null);
          }
        },
        setPersonne: (id) => {
          persist(K.personne, id);
          setP(id);
        },
        setCoachCode: (c) => {
          persist(K.coach, c);
          setC(c);
        },
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
