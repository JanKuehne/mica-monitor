export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { countryFlag, countryName } from "@/lib/countries";
import type { ServiceCode } from "@/lib/supabase";
import LicenseGrid from "@/components/company/license-grid";
import CompanyDetailTabs from "@/components/company/company-detail-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink } from "lucide-react";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (!company) notFound();

  const [{ data: services }, { data: tokenIssuers }, { data: news }] = await Promise.all([
    supabase
      .from("company_services")
      .select("service_code, service_name")
      .eq("company_id", id)
      .order("service_code"),
    supabase
      .from("token_issuers")
      .select("*")
      .eq("linked_casp_lei", company.lei)
      .order("issuer_name"),
    supabase
      .from("company_news")
      .select("id, headline, snippet, url, source_name, published_at, relevance")
      .eq("company_id", id)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  const RELEVANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedNews = (news || []).slice().sort((a, b) => {
    const rDiff = (RELEVANCE_RANK[a.relevance] ?? 1) - (RELEVANCE_RANK[b.relevance] ?? 1);
    if (rDiff !== 0) return rDiff;
    return (b.published_at ?? "").localeCompare(a.published_at ?? "");
  });

  const activeCodes = (services || []).map((s) => s.service_code as ServiceCode);
  const displayName = company.commercial_name || company.company_name;
  const flag = countryFlag(company.country || company.home_member_state);
  const country = countryName(company.country || company.home_member_state);

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const passScope =
    company.passporting_count >= 27
      ? "Pan-European"
      : company.passporting_count <= 1
      ? "Local"
      : "Regional";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Companies
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start gap-4">
          {company.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={displayName}
              className="h-12 w-12 rounded-lg object-contain bg-white border border-muted shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {company.commercial_name && company.commercial_name !== company.company_name && (
              <p className="text-muted-foreground">{company.company_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{flag} {country}</span>
          <span>LEI: <span className="font-mono text-foreground">{company.lei}</span></span>
          {company.competent_authority && <span>{company.competent_authority}</span>}
          <span>Licensed: {formatDate(company.authorization_date)}</span>
          {company.last_updated_esma && (
            <span>ESMA updated: {formatDate(company.last_updated_esma)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {company.website_platform && company.website_platform !== company.website && (
            <a
              href={company.website_platform}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Trading Platform <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {company.linkedin_url && (
            <a
              href={company.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <CompanyDetailTabs
        news={sortedNews as any}
        overviewContent={<>
          {/* License grid */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              MiCA Services ({activeCodes.length}/10)
            </h2>
            <LicenseGrid activeCodes={activeCodes} />
          </section>

          {/* Passporting */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Passporting — {passScope} ({company.passporting_count} {company.passporting_count === 1 ? "country" : "countries"})
            </h2>
            {company.passporting_countries && company.passporting_countries.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {company.passporting_countries.map((c: string) => (
                  <span
                    key={c}
                    title={countryName(c)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs font-medium"
                  >
                    {countryFlag(c)} {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No passporting data</p>
            )}
          </section>

          {/* Token issuers */}
          {(tokenIssuers || []).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Linked Token Issuers ({tokenIssuers!.length})
              </h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issuer</TableHead>
                      <TableHead className="w-16">Country</TableHead>
                      <TableHead>Offering countries</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokenIssuers!.map((ti) => (
                      <TableRow key={ti.id}>
                        <TableCell className="font-medium">{ti.issuer_name}</TableCell>
                        <TableCell>{countryFlag(ti.country_code)} {ti.country_code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ti.offer_countries?.join(", ") || "—"}
                        </TableCell>
                        <TableCell>
                          {ti.white_paper_url && (
                            <a href={ti.white_paper_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </>}
        sidebarContent={<>
          {/* Address */}
          {company.address && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Address
              </h2>
              <p className="text-sm">{company.address}</p>
            </section>
          )}

          {/* ESMA comments */}
          {company.esma_comments && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                ESMA Comments
              </h2>
              <p className="text-sm text-muted-foreground">{company.esma_comments}</p>
            </section>
          )}
        </>}
      />
    </div>
  );
}
