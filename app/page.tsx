export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import CompanyTable from "@/components/companies/company-table";
import CompanyFilters from "@/components/companies/company-filters";
import type { ServiceCode } from "@/lib/supabase";

const PAGE_SIZE = 50;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface SearchParams {
  q?: string;
  country?: string;
  segment?: string;
  passporting?: string;
  services?: string;
  page?: string;
}

async function getCompanies(params: SearchParams) {
  const supabase = getSupabase();
  const page = Math.max(1, parseInt(params.page || "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("companies")
    .select(
      `*, company_services(service_code, service_name)`,
      { count: "exact" }
    )
    .order("commercial_name", { ascending: true, nullsFirst: false })
    .order("company_name", { ascending: true })
    .range(from, to);

  if (params.q) {
    query = query.or(
      `commercial_name.ilike.%${params.q}%,company_name.ilike.%${params.q}%,lei.ilike.%${params.q}%`
    );
  }

  if (params.country && params.country !== "all") {
    query = query.eq("home_member_state", params.country);
  }

  if (params.segment && params.segment !== "all") {
    query = query.eq("segment", params.segment);
  }

  if (params.passporting && params.passporting !== "all") {
    if (params.passporting === "local") {
      query = query.lte("passporting_count", 1);
    } else if (params.passporting === "regional") {
      query = query.gt("passporting_count", 1).lt("passporting_count", 27);
    } else if (params.passporting === "pan-eu") {
      query = query.gte("passporting_count", 27);
    }
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching companies:", error);
    return { companies: [], total: 0 };
  }

  // Filter by service codes client-side after fetching
  // (Supabase doesn't easily support filtering by related table values in a single query)
  let companies = data || [];
  if (params.services) {
    const codes = params.services.split(",").filter(Boolean);
    companies = companies.filter((c) =>
      codes.every((code) =>
        c.company_services.some((s: { service_code: ServiceCode }) => s.service_code === code)
      )
    );
  }

  return { companies, total: count || 0 };
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const { companies, total } = await getCompanies(params);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {total} MiCA-licensed entities
          </p>
        </div>
      </div>

      <Suspense>
        <CompanyFilters />
      </Suspense>

      <CompanyTable
        companies={companies as any}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
