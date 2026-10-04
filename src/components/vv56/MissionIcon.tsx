import { Apple, Car, Coffee, Shirt, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Transport: Car,
  Maillots: Shirt,
  Collation: Apple,
  Buvette: Coffee,
  Installation: Wrench,
};

// Pictogramme de type de mission, dans une pastille discrète.
export function MissionIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? Sparkles;
  return (
    <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary", className)}>
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}
