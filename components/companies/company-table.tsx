"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, type Company } from "@/lib/supabase";
import { ServiceBadgeList } from "./service-badge";
import type { ServiceCode } from "@/lib/supabase";
import { countryFlag, countryName } from "@/lib/countries";
import { exportToD365Csv, downloadCsv } from "@/lib/export/d365-export";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ExternalLink, Info, Columns3 } from "lucide-react";
import { SERVICE_FULL_NAMES } from "@/lib/supabase";
import type { ServiceCode as SC } from "@/lib/supabase";
import {
  ALL_COLUMN_DEFS,
  loadColumnStates,
  saveColumnStates,
  loadDensity,
  saveDensity,
  loadSavedViews,
  saveSavedViews,
  type ColumnState,
  type Density,
  type SavedView,
} from "@/lib/column-prefs";

// ── Column manager loaded client-side only ────────────────────────────────────
const ColumnManager = dynamic(() => import("./column-manager"), { ssr: false });

type CompanyWithServices = Company & {
  company_services: { service_code: ServiceCode; service_name: string }[];
};

interface CompanyTableProps {
  companies: CompanyWithServices[];
  total: number;
  page: number;
  pageSize: number;
}

export default function CompanyTable({ companies, total, page, pageSize }: CompanyTableProps) {
  const router = useRouter();
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set());
  const [, startTransition]            = useTransition();
  const [showManager, setShowManager] = useState(false);

  // Column prefs — initialise from localStorage after mount
  const [columns, setColumns]       = useState<ColumnState[]>(() => ALL_COLUMN_DEFS.map((d) => ({
    id: d.id, width: d.defaultWidth, visible: d.defaultVisible,
  })));
  const [density, setDensity]       = useState<Density>("comfortable");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [hydrated, setHydrated]     = useState(false);

  useEffect(() => {
    setColumns(loadColumnStates());
    setDensity(loadDensity());
    setSavedViews(loadSavedViews());
    setHydrated(true);
  }, []);

  function handleColumnsChange(cols: ColumnState[]) {
    setColumns(cols);
    saveColumnStates(cols);
  }

  function handleDensityChange(d: Density) {
    setDensity(d);
    saveDensity(d);
  }

  function handleViewsChange(views: SavedView[], activeId: string | null) {
    setSavedViews(views);
    saveSavedViews(views);
    setActiveViewId(activeId);
  }

  function loadView(view: SavedView | null) {
    if (!view) {
      // Load default
      const defaults = ALL_COLUMN_DEFS.map((d) => ({ id: d.id, width: d.defaultWidth, visible: d.defaultVisible }));
      handleColumnsChange(defaults);
      setActiveViewId(null);
    } else {
      handleColumnsChange(view.columns);
      setActiveViewId(view.id);
    }
  }

  // ── Column resize ──────────────────────────────────────────────────────────
  const resizingRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { id: colId, startX: e.clientX, startW: currentWidth };

    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW  = Math.max(48, resizingRef.current.startW + delta);
      setColumns((prev) =>
        prev.map((c) => (c.id === resizingRef.current!.id ? { ...c, width: newW } : c))
      );
    }

    function onUp() {
      setColumns((prev) => {
        saveColumnStates(prev);
        return prev;
      });
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function toggleDesc(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const visibleCols  = columns.filter((c) => c.visible);
  const allSelected  = companies.length > 0 && companies.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(companies.map((c) => c.id)));
  }
  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function handleExport() {
    const csv  = exportToD365Csv(companies.filter((c) => selected.has(c.id)));
    const date = new Date().toISOString().split("T")[0];
    downloadCsv(csv, `mica-companies-${date}.csv`);
  }

  const totalPages = Math.ceil(total / pageSize);

  // Row padding based on density
  const cellPy = density === "compact" ? "py-1" : "py-2.5";

  // ── Cell renderers ─────────────────────────────────────────────────────────
  function renderCell(colId: string, company: CompanyWithServices) {
    const displayName  = company.commercial_name || company.company_name;
    const codes        = company.company_services.map((s) => s.service_code);
    const flagEmoji    = countryFlag(company.country || company.home_member_state);
    const countryLabel = countryName(company.country || company.home_member_state);
    const passScope    =
      company.passporting_count >= 27 ? "Pan-EU"
      : company.passporting_count <= 1 ? "Local"
      : "Regional";

    switch (colId) {
      case "company":
        return (
          <TableCell key="company" className={`${cellPy} min-w-0`}>
            <span className="font-medium leading-tight">{displayName}</span>
            {company.commercial_name && company.commercial_name !== company.company_name && (
              <div className="text-xs text-muted-foreground truncate">{company.company_name}</div>
            )}
            {company.description && (
              <div
                onClick={(e) => toggleDesc(e, company.id)}
                className={`text-xs text-muted-foreground mt-0.5 leading-relaxed cursor-pointer hover:text-foreground transition-colors ${
                  expandedDesc.has(company.id) ? "" : "truncate"
                }`}
                title={expandedDesc.has(company.id) ? "Click to collapse" : "Click to expand"}
              >
                {company.description}
              </div>
            )}
          </TableCell>
        );

      case "country":
        return (
          <TableCell key="country" className={cellPy}>
            <span title={countryLabel}>
              {flagEmoji} {company.country || company.home_member_state || "—"}
            </span>
          </TableCell>
        );

      case "city":
        return (
          <TableCell key="city" className={`${cellPy} text-sm text-muted-foreground`}>
            {company.city || "—"}
          </TableCell>
        );

      case "services":
        return (
          <TableCell key="services" className={cellPy}>
            <ServiceBadgeList codes={codes} />
          </TableCell>
        );

      case "svc_count":
        return (
          <TableCell key="svc_count" className={`${cellPy} text-center tabular-nums`}>
            {company.service_count}
          </TableCell>
        );

      case "segment":
        return (
          <TableCell key="segment" className={cellPy}>
            {company.segment
              ? <span className="text-sm">{company.segment}</span>
              : <span className="text-muted-foreground text-sm">—</span>}
          </TableCell>
        );

      case "passporting":
        return (
          <TableCell key="passporting" className={`${cellPy} text-center`}>
            <span className={`text-xs font-medium ${company.passporting_count >= 27 ? "text-foreground" : "text-muted-foreground"}`}>
              {passScope} ({company.passporting_count})
            </span>
          </TableCell>
        );

      case "auth_date":
        return (
          <TableCell key="auth_date" className={`${cellPy} text-xs text-muted-foreground tabular-nums`}>
            {company.authorization_date
              ? new Date(company.authorization_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "—"}
          </TableCell>
        );

      case "website":
        return (
          <TableCell key="website" className={cellPy}>
            {company.website && (
              <a
                href={company.website.match(/^https?:\/\//) ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </TableCell>
        );

      default:
        return <TableCell key={colId} className={cellPy}>—</TableCell>;
    }
  }

  return (
    <div className="space-y-3">

      {/* Views tab bar */}
      {hydrated && (
        <div className="flex items-center gap-1 border-b pb-0">
          {/* Default tab */}
          <button
            onClick={() => loadView(null)}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeViewId === null
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Default
          </button>
          {savedViews.map((v) => (
            <button
              key={v.id}
              onClick={() => loadView(v)}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeViewId === v.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={() => setShowManager(true)}
            className="ml-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground border-transparent border-b-2 -mb-px"
          >
            + Manage views
          </button>
        </div>
      )}

      {/* Toolbar: bulk actions + columns button */}
      <div className="flex items-center gap-2">
        {someSelected && (
          <>
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Deselect all
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {/* Density quick-toggle */}
          {hydrated && (
            <button
              onClick={() => handleDensityChange(density === "compact" ? "comfortable" : "compact")}
              title={density === "compact" ? "Switch to comfortable" : "Switch to compact"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-md hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
            >
              {density === "compact" ? (
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/>
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="2" y1="13.5" x2="14" y2="13.5"/>
                </svg>
              )}
              {density === "compact" ? "Comfortable" : "Compact"}
            </button>
          )}
          <button
            onClick={() => setShowManager(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-md hover:bg-muted/40 transition-colors"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table
          style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}
          className="text-sm"
        >
          {/* Column widths */}
          <colgroup>
            {[
              <col key="__checkbox" style={{ width: 40 }} />,
              ...visibleCols.map((col) => (
                <col key={col.id} style={{ width: col.width }} />
              )),
            ]}
          </colgroup>

          <thead>
            <tr className="border-b bg-muted/30">
              {/* Checkbox */}
              <th className="w-10 px-3 py-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>

              {visibleCols.map((col) => {
                const def = ALL_COLUMN_DEFS.find((d) => d.id === col.id)!;
                return (
                  <th
                    key={col.id}
                    className="relative px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap select-none"
                    style={{ width: col.width }}
                  >
                    {/* Special header for services column */}
                    {col.id === "services" ? (
                      <div className="flex items-center gap-1.5">
                        Services
                        <div className="relative group/info">
                          <Info className="h-3.5 w-3.5 cursor-help" />
                          <div className="absolute left-0 top-5 z-50 hidden group-hover/info:block w-72 rounded-lg border bg-popover p-3 shadow-md text-xs text-popover-foreground normal-case tracking-normal">
                            <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">MiCA Service Codes</p>
                            <div className="space-y-1.5">
                              {(Object.entries(SERVICE_FULL_NAMES) as [SC, string][]).map(([code, name]) => (
                                <div key={code} className="flex gap-2">
                                  <span className="font-mono font-bold uppercase shrink-0 text-primary">{code}</span>
                                  <span className="text-muted-foreground">{name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      def?.label ?? col.id
                    )}

                    {/* Resize handle */}
                    {def?.resizable && (
                      <span
                        onMouseDown={(e) => startResize(e, col.id, col.width)}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        title="Drag to resize"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y">
            {companies.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length + 1} className="text-center py-12 text-muted-foreground">
                  No companies match your filters.
                </td>
              </tr>
            )}
            {companies.map((company) => (
              <tr
                key={company.id}
                className={`cursor-pointer transition-colors hover:bg-muted/20 ${
                  selected.has(company.id) ? "bg-muted/30" : ""
                }`}
                onClick={() => router.push(`/companies/${company.id}`)}
              >
                <td className={`${cellPy} px-3`} onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(company.id)}
                    onCheckedChange={() => toggle(company.id)}
                  />
                </td>
                {visibleCols.map((col) => renderCell(col.id, company))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} companies
          </span>
          <div className="flex gap-2">
            <Link href={`?page=${page - 1}`} className={`px-3 py-1 rounded border ${page <= 1 ? "opacity-30 pointer-events-none" : "hover:bg-muted"}`}>
              Previous
            </Link>
            <Link href={`?page=${page + 1}`} className={`px-3 py-1 rounded border ${page >= totalPages ? "opacity-30 pointer-events-none" : "hover:bg-muted"}`}>
              Next
            </Link>
          </div>
        </div>
      )}

      {/* Column manager drawer */}
      {showManager && (
        <ColumnManager
          columns={columns}
          activeViewId={activeViewId}
          onColumnsChange={handleColumnsChange}
          onDensityChange={handleDensityChange}
          onViewsChange={handleViewsChange}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
}
