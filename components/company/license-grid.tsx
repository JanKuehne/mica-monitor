import { SERVICE_NAMES, type ServiceCode } from "@/lib/supabase";
import { ServiceBadge } from "@/components/companies/service-badge";

const ALL_CODES: ServiceCode[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

interface LicenseGridProps {
  activeCodes: ServiceCode[];
}

export default function LicenseGrid({ activeCodes }: LicenseGridProps) {
  const activeSet = new Set(activeCodes);

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ALL_CODES.map((code) => {
        const active = activeSet.has(code);
        return (
          <div
            key={code}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${
              active ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/10 opacity-40"
            }`}
          >
            <ServiceBadge code={code} active={active} size="sm" />
            <span className={`text-xs truncate ${active ? "font-medium" : "text-muted-foreground"}`}>
              {SERVICE_NAMES[code]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
