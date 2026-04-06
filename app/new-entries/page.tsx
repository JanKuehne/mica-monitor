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
  since?: string; // ISO date string
}

export default async function NewEntriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = getSupabase();

  // Default: entries from last 30 days
  const since =
    params.since ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: companies } = await supabase
    .from("companies")
    .select(`*, company_services(service_code, service_name)`)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const dateOptions: { label: string; value: string }[] = [
    {
      label: "Last 7 days",
      value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: "Last 30 days",
      value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: "Last 90 days",
      value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">New Entries</h1>
        <p className="text-sm text-muted-foreground">
          Companies added since last ESMA import
        </p>
      </div>

      {/* Time range filter */}
      <div className="flex gap-2">
        {dateOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/new-entries?since=${encodeURIComponent(opt.value)}`}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              since === opt.value
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="w-24">Country</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="w-32">Authorization date</TableHead>
              <TableHead className="w-32">Added to DB</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!companies || companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No new entries in this time period.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => {
                const displayName =
                  company.commercial_name || company.company_name;
                const codes = (company.company_services as { service_code: ServiceCode }[]).map(
                  (s) => s.service_code
                );
                const flag = countryFlag(
                  company.country || company.home_member_state
                );
                const cname = countryName(
                  company.country || company.home_member_state
                );

                return (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        href={`/companies/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {displayName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span title={cname}>
                        {flag}{" "}
                        {company.country || company.home_member_state || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ServiceBadgeList codes={codes} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.authorization_date
                        ? new Date(company.authorization_date).toLocaleDateString(
                            "en-GB"
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize">{company.status}</span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
