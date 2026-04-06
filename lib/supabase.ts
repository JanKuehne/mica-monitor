import { createClient } from '@supabase/supabase-js'

// Fallback prevents build-time throw when env vars aren't set yet.
// At runtime the real values from .env.local are always used.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching the DB schema
export type ServiceCode = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'

export const SERVICE_NAMES: Record<ServiceCode, string> = {
  a: 'Custody & administration',
  b: 'Trading platform',
  c: 'Exchange for funds',
  d: 'Exchange for crypto',
  e: 'Execution of orders',
  f: 'Placing',
  g: 'Reception & transmission',
  h: 'Advice',
  i: 'Portfolio management',
  j: 'Transfer services',
}

export const SERVICE_FULL_NAMES: Record<ServiceCode, string> = {
  a: 'Custody and administration of crypto-assets',
  b: 'Operation of a trading platform',
  c: 'Exchange of crypto-assets for funds',
  d: 'Exchange of crypto-assets for other crypto-assets',
  e: 'Execution of orders',
  f: 'Placing of crypto-assets',
  g: 'Reception and transmission of orders (RTO)',
  h: 'Providing advice on crypto-assets',
  i: 'Portfolio management',
  j: 'Transfer services for crypto-assets',
}

export const COMPANY_STATUSES = ['new', 'prospect', 'qualified', 'client', 'pass'] as const
export type CompanyStatus = typeof COMPANY_STATUSES[number]

export type Company = {
  id: string
  lei: string
  lei_cou_code: string | null
  company_name: string
  commercial_name: string | null
  competent_authority: string | null
  home_member_state: string | null
  address: string | null
  city: string | null
  country: string | null
  website: string | null
  website_platform: string | null
  authorization_date: string | null
  authorization_end_date: string | null
  last_updated_esma: string | null
  passporting_countries: string[] | null
  passporting_count: number
  esma_comments: string | null
  service_count: number
  linkedin_url: string | null
  description: string | null
  description_confidence: string | null
  segment: string | null
  parent_company_name: string | null
  parent_company_domain: string | null
  group_structure_notes: string | null
  latest_news_summary: string | null
  news_last_searched: string | null
  linked_token_issuers_count: number
  status: CompanyStatus
  amina_fit_score: number | null
  tags: string[] | null
  notes: string | null
  d365_source_tag: string
  flag_enrich_description: boolean
  flag_enrich_news: boolean
  flag_enrich_people: boolean
  enrichment_last_run: string | null
  created_at: string
  updated_at: string
}

export type CompanyService = {
  id: string
  company_id: string
  service_code: ServiceCode
  service_name: string
}

export type Contact = {
  id: string
  company_id: string
  given_name: string | null
  surname: string | null
  role: string | null
  linkedin_url: string | null
  email: string | null
  email_source: string | null
  phone: string | null
  location_city: string | null
  location_country: string | null
  discovery_source: string | null
  enrichment_confidence: string | null
  last_enriched: string | null
  outreach_status: string
  last_contact_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TokenIssuer = {
  id: string
  lei: string | null
  issuer_name: string
  country_code: string | null
  linked_casp_lei: string | null
  linked_casp_name: string | null
  offer_countries: string[] | null
  dti: string | null
  white_paper_url: string | null
  last_updated: string | null
  created_at: string
}
