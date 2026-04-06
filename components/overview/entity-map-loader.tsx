"use client";

// ssr: false must live inside a Client Component (Next.js App Router requirement)
import dynamic from "next/dynamic";
import type { MapCompany } from "./entity-map";

const EntityMap = dynamic(() => import("./entity-map"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-lg border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground"
      style={{ height: 480 }}
    >
      Loading map…
    </div>
  ),
});

interface Props {
  companies: MapCompany[];
}

export default function EntityMapLoader({ companies }: Props) {
  return <EntityMap companies={companies} />;
}
