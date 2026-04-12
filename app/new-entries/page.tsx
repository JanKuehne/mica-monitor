export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ServiceBadgeList } from "@/components/companies/service-badge";
import { countryFlag, countryName } from "@/lib/countries";
import type { ServiceCode } from "@/lib/supabase";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface SearchParams {
  since?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function NewEntriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = getSupabase();

  const since =
    params.since ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: companies } = await supabase
    .from("companies")
    .select(`*, company_services(service_code, service_name)`)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const dateOptions = [
    { label: "Last 7 days",  value: new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString() },
    { label: "Last 30 days", value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { label: "Last 90 days", value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const all = companies || [];

  // Split: latest batch (most recent created_at date) vs older
  const latestDate = all.length > 0
    ? new Date(all[0].created_at).toDateString()
    : null;

  const latestBatch = all.filter((c) => new Date(c.created_at).toDateString() === latestDate);
  const olderEntries = all.filter((c) => new Date(c.created_at).toDateString() !== latestDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New Entries</h1>
        <p className="text-sm text-muted-foreground">Companies added since last ESMA import</p>
      </div>

      {/* Time range filter */}
      <div className="flex gap-2">
        {dateOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/new-entries?since=${encodeURIComponent(opt.value)}`}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              since === opt.value ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No new entries in this time period.</p>
      ) : (
        <>
          {/* ── Latest batch tiles ── */}
          {latestBatch.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">
                  Latest batch — {formatDate(latestBatch[0].created_at)}
                </h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {latestBatch.length} new
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {latestBatch.map((company) => {
                  const displayName = company.commercial_name || company.company_name;
                  const codes = (company.company_services as { service_code: ServiceCode }[]).map((s) => s.service_code);
                  const flag = countryFlag(company.country || company.home_member_state);
                  const cname = countryName(company.country || company.home_member_state);

                  return (
                    <Link
                      key={company.id}
                      href={`/companies/${company.id}`}
                      className="group block rounded-lg border bg-card p-4 hover:border-foreground/30 hover:shadow-sm transition-all space-y-3"
                    >
                      <div>
                        <p className="font-semibold text-sm leading-tight group-hover:underline">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span title={cname}>{flag}</span>{" "}
                          {company.country || company.home_member_state || "—"}
                          {company.segment && (
                            <span className="ml-2 text-muted-foreground/70">· {company.segment}</span>
                          )}
                        </p>
                      </div>

                      <ServiceBadgeList codes={codes} />

                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {company.description}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Auth. {company.authorization_date
                          ? formatDate(company.authorization_date)
                          : "—"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Older entries list ── */}
          {olderEntries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Previous entries</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="w-24">Country</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead className="w-32">Authorization date</TableHead>
                      <TableHead className="w-32">Added to DB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {olderEntries.map((company) => {
                      const displayName = company.commercial_name || company.company_name;
                      const codes = (company.company_services as { service_code: ServiceCode }[]).map((s) => s.service_code);
                      const flag = countryFlag(company.country || company.home_member_state);
                      const cname = countryName(company.country || company.home_member_state);

                      return (
                        <TableRow key={company.id}>
                          <TableCell>
                            <Link href={`/companies/${company.id}`} className="font-medium hover:underline">
                              {displayName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span title={cname}>
                              {flag} {company.country || company.home_member_state || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ServiceBadgeList codes={codes} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {company.authorization_date ? formatDate(company.authorization_date) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(company.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
