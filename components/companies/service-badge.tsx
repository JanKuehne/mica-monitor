import { cn } from "@/lib/utils";
import { SERVICE_NAMES, SERVICE_FULL_NAMES, type ServiceCode } from "@/lib/supabase";

interface ServiceBadgeProps {
  code: ServiceCode;
  active?: boolean;
  size?: "sm" | "md";
}

export function ServiceBadge({ code, active = true, size = "sm" }: ServiceBadgeProps) {
  return (
    <span
      title={`${code.toUpperCase()} — ${SERVICE_FULL_NAMES[code]}`}
      className={cn(
        "inline-flex items-center justify-center rounded font-mono font-semibold uppercase",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs",
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {code}
    </span>
  );
}

interface ServiceBadgeListProps {
  codes: ServiceCode[];
}

export function ServiceBadgeList({ codes }: ServiceBadgeListProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <ServiceBadge key={code} code={code} />
      ))}
    </div>
  );
}
