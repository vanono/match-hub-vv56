<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Start every session by reading docs/SUIVI-PROJET.md (project memory: decisions, current state, demo reset procedure, pending items) and keep it up to date after each decision or delivery. The project owner works in French.

- Airtable is the source of truth; all reads/writes go through server functions in src/lib/vv56.functions.ts using src/lib/airtable.server.ts (gateway) — no token ever reaches the browser.
- No accounts: team code / chosen person / coach code live in localStorage and the team code (plus coach code) is re-verified server-side on every call.
- Mission coverage is computed client-side from non-cancelled contributions (src/lib/vv56-types.ts), not from Airtable rollups, so it updates instantly after sign-up.
