"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";

export interface MapCompany {
  id: string;
  company_name: string;
  commercial_name: string | null;
  segment: string | null;
  country: string | null;
  city: string | null;
  lat: number;
  lng: number;
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

const DEFAULT_COLOR = "#94a3b8";

interface Props {
  companies: MapCompany[];
}

export default function EntityMap({ companies }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ height: 480 }}>
      <MapContainer
        center={[51, 12]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {companies.map((c) => {
          const color = SEGMENT_COLORS[c.segment ?? ""] ?? DEFAULT_COLOR;
          const name  = c.commercial_name || c.company_name;
          return (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lng]}
              radius={7}
              pathOptions={{
                color: "#fff",
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[150px]">
                  <p className="font-semibold leading-tight">{name}</p>
                  {c.city && (
                    <p className="text-gray-500 text-xs">{c.city}{c.country ? `, ${c.country}` : ""}</p>
                  )}
                  {c.segment && (
                    <span
                      className="inline-block text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: color + "22", color }}
                    >
                      {c.segment}
                    </span>
                  )}
                  <div className="pt-1">
                    <Link
                      href={`/companies/${c.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View detail →
                    </Link>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
