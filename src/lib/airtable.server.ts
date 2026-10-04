const GATEWAY_URL = "https://connector-gateway.lovable.dev/airtable";
export const BASE_ID = "appuPJ6oX1Hvi81BE";
export const T = {
  equipes: "tblD18VlUH24SHPms",
  personnes: "tblwMuvF5YiNFsUaP",
  matchs: "tblSqxsEFdZdQnFFm",
  missions: "tblII9HIdW16178qW",
  contributions: "tbl6s0cL3ub8yCIR0",
};

export type AirRecord = { id: string; fields: Record<string, any> };

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const air = process.env["AIRTABLE_API_KEY"];
  if (!lovable || !air) throw new Error("Connexion Airtable non configurée.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": air,
    "Content-Type": "application/json",
  };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}/v0/${BASE_ID}/${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Airtable [${res.status}]: ${body}`);
    throw new Error(`Airtable a répondu une erreur (${res.status}).`);
  }
  return res.json();
}

export async function listAll(table: string, formula?: string): Promise<AirRecord[]> {
  const out: AirRecord[] = [];
  let offset: string | undefined;
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (formula) q.set("filterByFormula", formula);
    if (offset) q.set("offset", offset);
    const d = await call(`${table}?${q}`);
    out.push(...d.records);
    offset = d.offset;
  } while (offset);
  return out;
}

export async function getRecord(table: string, id: string): Promise<AirRecord> {
  return call(`${table}/${id}`);
}

export async function createRecord(table: string, fields: Record<string, any>) {
  return call(table, { method: "POST", body: JSON.stringify({ fields, typecast: true }) });
}

export async function updateRecord(table: string, id: string, fields: Record<string, any>) {
  return call(`${table}/${id}`, { method: "PATCH", body: JSON.stringify({ fields, typecast: true }) });
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export async function findTeamByCode(code: string): Promise<AirRecord | null> {
  const c = code.trim().toUpperCase();
  if (!c || c.length > 40) return null;
  const r = await listAll(T.equipes, `UPPER(TRIM({Code d'accès}))="${esc(c)}"`);
  return r[0] ?? null;
}
