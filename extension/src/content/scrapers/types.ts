// The scrapers' only type. Kept inside this folder so the folder is
// self-contained: scripts/sync-scrapers.mjs copies it verbatim to the scrape
// Edge Function (backend/supabase/functions/_shared/scrapers/).
export interface JobData {
  title: string
  company: string
  description: string
  url: string
}
