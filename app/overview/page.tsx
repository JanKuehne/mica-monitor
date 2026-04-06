export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";
import { COUNTRY_NAMES } from "@/lib/countries";
import EntityMapLoader from "@/components/overview/entity-map-loader";
import type { MapCompany } from "@/components/overview/entity-map";

const SEGMENTS = [
  "Exchange",
  "NeoBroker",
  "Custodian",
  "Asset Manager",
  "Broker/OTC",
  "Infrastructure",
  "TradFi Entrant",
  "Payment/Stablecoin",
] as const;

const SEGMENT_SHORT: Record<string, string> = {
  "Exchange": "Exchange",
  "NeoBroker": "NeoBroker",
  "Custodian": "Custodian",
  "Asset Manager": "Asset Mgr",
  "Broker/OTC": "OTC",
  "Infrastructure": "Infra",
  "TradFi Entrant": "TradFi",
  "Payment/Stablecoin": "Payment",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getData() {
  const supabase = getSupabase();
  const [{ data: heatmapRows }, { data: mapRows }] = await Promise.all([
    supabase
      .from("companies")
      .select("country, segment")
      .not("country", "is", null)
      .not("segment", "is", null),
    supabase
      .from("companies")
      .select("id, company_name, commercial_name, segment, country, city, lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null),
  ]);

  return { heatmapRows: heatmapRows || [], mapRows: (mapRows || []) as MapCompany[] };
}

const SEGMENT_COLORS: Record<string, string> = {
  "Exchange":          "#3b82f6",
  "NeoBroker":         "#22c55e",
  "Custodian":         "#f97316",
  "Asset Manager":     "#a855f7",
  "Broker/OTC":        "#ef4444",
  "Infrastructure":    "#6b7280",
  "TradFi Entrant":    "#1d4ed8",
  "Payment/Stablecoin":"#14b8a6",
};

export default async function OverviewPage() {
  const { heatmapRows: rows, mapRows } = await getData();

  // Build country → segment → count matrix
  const matrix: Record<string, Record<string, number>> = {};
  const countryTotals: Record<string, number> = {};
  const segmentTotals: Record<string, number> = {};

  for (const row of rows) {
    const c = row.country as string;
    const s = row.segment as string;
    if (!matrix[c]) matrix[c] = {};
    matrix[c][s] = (matrix[c][s] || 0) + 1;
    countryTotals[c] = (countryTotals[c] || 0) + 1;
    segmentTotals[s] = (segmentTotals[s] || 0) + 1;
  }

  // Sort countries by total descending
  const countries = Object.keys(countryTotals).sort(
    (a, b) => countryTotals[b] - countryTotals[a]
  );

  const maxCell = Math.max(...Object.values(matrix).flatMap((m) => Object.values(m)));
  const total = rows.length;

  // Intensity: returns a tailwind-style opacity level
  function intensity(count: number): string {
    if (!count) return "";
    const ratio = count / maxCell;
    if (ratio >= 0.8) return "bg-primary/90 text-primary-foreground font-semibold";
    if (ratio >= 0.6) return "bg-primary/70 text-primary-foreground font-semibold";
    if (ratio >= 0.4) return "bg-primary/50 text-primary-foreground";
    if (ratio >= 0.2) return "bg-primary/30 text-primary";
    return "bg-primary/15 text-primary";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} MiCA-licensed entities across {countries.length} countries
          </p>
        </div>
      </div>

      {/* Map — top of page */}
      <div>
        <EntityMapLoader companies={mapRows} />
        {/* Map footer: legend left, geocode status right */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {SEGMENTS.map((seg) => (
              <span key={seg} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: SEGMENT_COLORS[seg] }}
                />
                {seg}
              </span>
            ))}
          </div>
          {mapRows.length < total && (
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
              {mapRows.length}/{total} geocoded
            </span>
          )}
        </div>
      </div>

      {/* Segment breakdown — compact 3-column grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          By segment
        </h2>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-y">
            {SEGMENTS.map((seg) => (
              <div key={seg} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SEGMENT_COLORS[seg] }}
                  />
                  {seg}
                </span>
                <span className="font-semibold tabular-nums text-sm ml-3">
                  {segmentTotals[seg] ?? 0}
                </span>
              </div>
            ))}
            {/* Total cell — fills 9th slot */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold tabular-nums text-sm ml-3">{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Country × Segment
        </h2>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-36">
                  Country
                </th>
                {SEGMENTS.map((seg) => (
                  <th
                    key={seg}
                    className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-nowrap"
                    title={seg}
                  >
                    {SEGMENT_SHORT[seg]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-muted-foreground text-center">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {countries.map((cc) => (
                <tr key={cc} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 font-medium text-sm whitespace-nowrap">
                    {COUNTRY_NAMES[cc] ?? cc}
                  </td>
                  {SEGMENTS.map((seg) => {
                    const count = matrix[cc]?.[seg] ?? 0;
                    return (
                      <td key={seg} className="px-2 py-1.5 text-center">
                        {count > 0 ? (
                          <span
                            className={`inline-flex items-center justify-center rounded min-w-[1.75rem] h-6 px-1.5 text-xs tabular-nums ${intensity(count)}`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-semibold tabular-nums text-sm">
                    {countryTotals[cc]}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-3 py-2 font-semibold text-sm">Total</td>
                {SEGMENTS.map((seg) => (
                  <td key={seg} className="px-2 py-2 text-center font-semibold tabular-nums text-sm">
                    {segmentTotals[seg] ?? 0}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-bold tabular-nums text-sm">
                  {total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Darker = higher concentration.
        </p>
      </div>
    </div>
  );
}
