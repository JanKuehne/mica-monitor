#!/usr/bin/env node
/**
 * Batch-geocode all companies that don't yet have lat/lng, using
 * Nominatim (OpenStreetMap) — free, no API key required.
 *
 * Rate limit: 1 request / second (Nominatim policy).
 *
 * Usage:
 *   node scripts/geocode-companies.mjs           # geocode all missing
 *   node scripts/geocode-companies.mjs --dry-run  # preview without writing
 *   node scripts/geocode-companies.mjs --force     # re-geocode everything
 */

import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");

const DELAY_MS = 1100; // Nominatim: max 1 req/sec

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Query Nominatim for a text string. Returns { lat, lng } or null.
 */
async function nominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MiCA-Entities-Dashboard/1.0 (internal tool)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    console.warn(`  Nominatim HTTP ${res.status} for "${query}"`);
    return null;
  }

  const data = await res.json();
  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

/**
 * Try progressively looser queries until we get a result.
 * Priority: city+country → address → country only
 */
async function geocodeCompany(company) {
  const city    = company.city;
  const country = company.country || company.home_member_state;
  const address = company.address;

  // 1. City + country (most reliable for our data)
  if (city && country) {
    const result = await nominatim(`${city}, ${country}`);
    if (result) return { ...result, method: "city+country" };
  }

  // 2. Full address
  if (address) {
    const result = await nominatim(address);
    if (result) return { ...result, method: "address" };
  }

  // 3. Country only (pin to capital / centroid — better than nothing)
  if (country) {
    const result = await nominatim(country);
    if (result) return { ...result, method: "country" };
  }

  return null;
}

async function main() {
  // Fetch companies needing geocoding
  let query = supabase
    .from("companies")
    .select("id, company_name, commercial_name, city, country, home_member_state, address");

  if (!FORCE) {
    query = query.is("geocoded_at", null);
  }

  const { data: companies, error } = await query.order("company_name");

  if (error) {
    console.error("Failed to fetch companies:", error.message);
    process.exit(1);
  }

  console.log(`Found ${companies.length} companies to geocode${FORCE ? " (force mode)" : ""}.`);
  if (DRY_RUN) console.log("DRY RUN — no writes.\n");

  let ok = 0, failed = 0, countryFallback = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const displayName = c.commercial_name || c.company_name;

    process.stdout.write(`[${i + 1}/${companies.length}] ${displayName} … `);

    await sleep(DELAY_MS);

    const result = await geocodeCompany(c);

    if (!result) {
      console.log("❌ not found");
      failed++;
      continue;
    }

    if (result.method === "country") countryFallback++;

    console.log(`✓ ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} (${result.method})`);
    ok++;

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("companies")
        .update({ lat: result.lat, lng: result.lng, geocoded_at: new Date().toISOString() })
        .eq("id", c.id);

      if (updateError) {
        console.error(`  ⚠ DB update failed: ${updateError.message}`);
      }
    }
  }

  console.log("\n=== Geocoding complete ===");
  console.log(`  Geocoded:        ${ok}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`  Country-only:    ${countryFallback} (pinned to country centroid)`);
  if (DRY_RUN) console.log("  (dry run — nothing written)");
}

main().catch((e) => { console.error(e); process.exit(1); });
