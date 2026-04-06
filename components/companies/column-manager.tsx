"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, RotateCcw, Trash2, Check, Save } from "lucide-react";
import {
  ALL_COLUMN_DEFS,
  DEFAULT_COLUMN_STATES,
  loadSavedViews,
  saveSavedViews,
  type ColumnState,
  type SavedView,
} from "@/lib/column-prefs";

// ── Sortable column row ───────────────────────────────────────────────────────
function SortableColumn({ col, onToggle }: { col: ColumnState; onToggle: (id: string) => void }) {
  const def = ALL_COLUMN_DEFS.find((d) => d.id === col.id)!;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md select-none ${
        isDragging ? "bg-muted/60 shadow-md z-50" : "hover:bg-muted/30"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        onClick={() => onToggle(col.id)}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          col.visible ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {col.visible && <Check className="h-2.5 w-2.5" />}
      </button>
      <span className={`text-sm flex-1 ${col.visible ? "text-foreground" : "text-muted-foreground"}`}>
        {def?.label ?? col.id}
      </span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  columns: ColumnState[];
  activeViewId: string | null;
  onColumnsChange: (cols: ColumnState[]) => void;
  onDensityChange: (d: import("@/lib/column-prefs").Density) => void; // kept for future view-level density
  onViewsChange: (views: SavedView[], activeId: string | null) => void;
  onClose: () => void;
}

export default function ColumnManager({
  columns,
  activeViewId,
  onColumnsChange,
  onViewsChange,
  onClose,
}: Props) {
  const [localCols, setLocalCols] = useState<ColumnState[]>(columns);
  const [views, setViews]         = useState<SavedView[]>(loadSavedViews);
  const [saving, setSaving]       = useState(false);    // show name input
  const [newName, setNewName]     = useState("");
  const [flashId, setFlashId]     = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Any unsaved changes vs current columns prop?
  const isDirty = JSON.stringify(localCols) !== JSON.stringify(columns);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localCols.findIndex((c) => c.id === active.id);
    const newIdx = localCols.findIndex((c) => c.id === over.id);
    setLocalCols(arrayMove(localCols, oldIdx, newIdx));
  }

  function toggleVisible(id: string) {
    setLocalCols((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  // Apply without saving a named view (overwrites "current" state)
  function handleApply() {
    onColumnsChange(localCols);
    flash("__apply");
  }

  function flash(id: string) {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1200);
  }

  // Save current config as a named view
  function handleSaveView() {
    const name = newName.trim();
    if (!name) return;

    const view: SavedView = {
      id: crypto.randomUUID(),
      name,
      columns: localCols,
    };
    const updated = [...views, view];
    setViews(updated);
    saveSavedViews(updated);
    onColumnsChange(localCols);               // also apply
    onViewsChange(updated, view.id);
    setNewName("");
    setSaving(false);
    flash(view.id);
  }

  // Update an existing view with current state
  function handleUpdateView(viewId: string) {
    const updated = views.map((v) =>
      v.id === viewId ? { ...v, columns: localCols } : v
    );
    setViews(updated);
    saveSavedViews(updated);
    onColumnsChange(localCols);
    onViewsChange(updated, viewId);
    flash(viewId);
  }

  function handleLoadView(view: SavedView) {
    setLocalCols(view.columns);
    onColumnsChange(view.columns);
    onViewsChange(views, view.id);
  }

  function handleDeleteView(id: string) {
    const updated = views.filter((v) => v.id !== id);
    setViews(updated);
    saveSavedViews(updated);
    onViewsChange(updated, activeViewId === id ? null : activeViewId);
  }

  function handleReset() {
    setLocalCols(DEFAULT_COLUMN_STATES);
    onColumnsChange(DEFAULT_COLUMN_STATES);
    onViewsChange(views, null);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-80 z-50 bg-background border-l shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Columns &amp; views</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── Saved views ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Views
            </p>

            {/* Default */}
            <button
              onClick={() => { setLocalCols(DEFAULT_COLUMN_STATES); onColumnsChange(DEFAULT_COLUMN_STATES); onViewsChange(views, null); }}
              className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm mb-0.5 transition-colors ${
                activeViewId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/40"
              }`}
            >
              Default
              {activeViewId === null && <Check className="h-3.5 w-3.5" />}
            </button>

            {views.map((v) => (
              <div key={v.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => handleLoadView(v)}
                  className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-sm truncate transition-colors ${
                    activeViewId === v.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/40"
                  }`}
                >
                  {flashId === v.id ? "✓ Saved" : v.name}
                </button>
                {/* Update existing view if it's active and dirty */}
                {activeViewId === v.id && isDirty && (
                  <button
                    onClick={() => handleUpdateView(v.id)}
                    className="text-muted-foreground hover:text-primary p-1 rounded"
                    title="Update this view"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteView(v.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Save as new view */}
            {saving ? (
              <div className="flex gap-1.5 mt-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveView(); if (e.key === "Escape") setSaving(false); }}
                  placeholder="View name…"
                  className="flex-1 text-sm px-2.5 py-1.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleSaveView}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                >
                  Save
                </button>
                <button onClick={() => setSaving(false)} className="px-2 py-1.5 rounded-md border text-sm hover:bg-muted/40">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                className="mt-2 w-full text-left px-2.5 py-1.5 rounded-md border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                + Save current as new view…
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* ── Columns ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Columns — drag to reorder
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localCols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {localCols.map((col) => (
                    <SortableColumn key={col.id} col={col} onToggle={toggleVisible} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted/40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={!isDirty}
            className={`ml-auto px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${
              flashId === "__apply"
                ? "bg-green-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {flashId === "__apply" ? "Applied ✓" : "Apply"}
          </button>
        </div>
      </div>
    </>
  );
}
