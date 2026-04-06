export type Density = "comfortable" | "compact";

export interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;   // px
  defaultVisible: boolean;
  resizable: boolean;
  pinned?: boolean;       // checkbox column — always first, not moveable
}

export interface ColumnState {
  id: string;
  width: number;
  visible: boolean;
}

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnState[];
}

// ── Column catalogue ──────────────────────────────────────────────────────────
export const ALL_COLUMN_DEFS: ColumnDef[] = [
  { id: "company",     label: "Company",      defaultWidth: 300, defaultVisible: true,  resizable: true },
  { id: "country",     label: "Country",      defaultWidth: 90,  defaultVisible: true,  resizable: true },
  { id: "city",        label: "City",         defaultWidth: 110, defaultVisible: false, resizable: true },
  { id: "services",    label: "Services",     defaultWidth: 200, defaultVisible: true,  resizable: true },
  { id: "svc_count",   label: "Svc #",        defaultWidth: 60,  defaultVisible: true,  resizable: false },
  { id: "segment",     label: "Segment",      defaultWidth: 140, defaultVisible: true,  resizable: true },
  { id: "status",      label: "Status",       defaultWidth: 110, defaultVisible: true,  resizable: false },
  { id: "passporting", label: "Passporting",  defaultWidth: 130, defaultVisible: true,  resizable: true },
  { id: "auth_date",   label: "Auth. Date",   defaultWidth: 110, defaultVisible: false, resizable: true },
  { id: "website",     label: "Website",      defaultWidth: 48,  defaultVisible: true,  resizable: false },
];

export const DEFAULT_COLUMN_STATES: ColumnState[] = ALL_COLUMN_DEFS.map((c) => ({
  id: c.id,
  width: c.defaultWidth,
  visible: c.defaultVisible,
}));

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const PREFS_KEY  = "mica-column-prefs-v1";
const VIEWS_KEY  = "mica-saved-views-v1";
const DENSITY_KEY = "mica-density-v1";

export function loadColumnStates(): ColumnState[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_COLUMN_STATES;
    const stored: ColumnState[] = JSON.parse(raw);
    // Merge with defaults so new columns added later still appear
    const map = new Map(stored.map((c) => [c.id, c]));
    return ALL_COLUMN_DEFS.map((def) =>
      map.get(def.id) ?? { id: def.id, width: def.defaultWidth, visible: def.defaultVisible }
    );
  } catch {
    return DEFAULT_COLUMN_STATES;
  }
}

export function saveColumnStates(cols: ColumnState[]) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(cols));
}

export function loadDensity(): Density {
  try {
    return (localStorage.getItem(DENSITY_KEY) as Density) ?? "comfortable";
  } catch {
    return "comfortable";
  }
}

export function saveDensity(d: Density) {
  localStorage.setItem(DENSITY_KEY, d);
}

export function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedViews(views: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
}
