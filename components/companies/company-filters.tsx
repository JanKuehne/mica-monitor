"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_NAMES } from "@/lib/countries";
import { SERVICE_NAMES, type ServiceCode } from "@/lib/supabase";
import { X, Search } from "lucide-react";

const SERVICE_CODES = Object.keys(SERVICE_NAMES) as ServiceCode[];

const SEGMENTS = [
  "Exchange",
  "NeoBroker",
  "Custodian",
  "Asset Manager",
  "Broker/OTC",
  "Infrastructure",
  "TradFi Entrant",
  "Payment/Stablecoin",
];

export default function CompanyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const toggleService = useCallback(
    (code: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get("services")?.split(",").filter(Boolean) || [];
      const idx = current.indexOf(code);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(code);
      }
      if (current.length > 0) {
        params.set("services", current.join(","));
      } else {
        params.delete("services");
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const q = searchParams.get("q") || "";
  const country = searchParams.get("country") || "all";
  const segment = searchParams.get("segment") || "all";
  const passporting = searchParams.get("passporting") || "all";
  const selectedServices = searchParams.get("services")?.split(",").filter(Boolean) || [];
  const hasFilters = q || country !== "all" || segment !== "all" || passporting !== "all" || selectedServices.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={q}
            onChange={(e) => updateParam("q", e.target.value || null)}
            className="w-56 pl-8"
          />
        </div>

        {/* Country */}
        <Select
          value={country !== "all" ? country : null}
          onValueChange={(v) => updateParam("country", v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {Object.entries(COUNTRY_NAMES)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Segment */}
        <Select
          value={segment !== "all" ? segment : null}
          onValueChange={(v) => updateParam("segment", v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            {SEGMENTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Passporting scope */}
        <Select
          value={passporting !== "all" ? passporting : null}
          onValueChange={(v) => updateParam("passporting", v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All scopes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="local">Local (1 country)</SelectItem>
            <SelectItem value="regional">Regional (2–26)</SelectItem>
            <SelectItem value="pan-eu">Pan-European (27+)</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Service code filters */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground mr-1">Services:</span>
        {SERVICE_CODES.map((code) => {
          const active = selectedServices.includes(code);
          return (
            <button
              key={code}
              title={SERVICE_NAMES[code]}
              onClick={() => toggleService(code)}
              className={`h-6 w-6 rounded text-[10px] font-mono font-semibold uppercase transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
