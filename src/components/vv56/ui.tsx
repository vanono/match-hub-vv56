import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}>{children}</div>;
}

type BtnVariant = "primary" | "accent" | "outline" | "ghost" | "whatsapp";
const variants: Record<BtnVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline: "border-2 border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted",
  whatsapp: "bg-success text-primary-foreground hover:bg-success/90",
};
export function Btn({
  variant = "primary",
  className,
  loading,
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Pill({ tone, children }: { tone: "warning" | "success" | "info" | "muted"; children: ReactNode }) {
  const t = {
    warning: "bg-warning-soft text-warning-foreground",
    success: "bg-success-soft text-success-foreground",
    info: "bg-secondary text-secondary-foreground",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", t)}>{children}</span>;
}

export function Progress({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "success" | "warning" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const c = { accent: "bg-accent", success: "bg-success", warning: "bg-warning" }[tone];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all duration-500", c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="space-y-3 py-4" aria-busy>
      <p className="sr-only">{label}</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="text-center">
      <p className="font-semibold">Oups, les données n'ont pas pu être chargées.</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Btn variant="outline" className="mt-4" onClick={onRetry}>
          Réessayer
        </Btn>
      )}
    </Card>
  );
}

export function Empty({ emoji, title, text }: { emoji: string; title: string; text?: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-2 font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
