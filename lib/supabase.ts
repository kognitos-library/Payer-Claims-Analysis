import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.warn("Supabase credentials missing — chat persistence disabled");
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

const _admin = url && serviceKey ? createClient(url, serviceKey) : null;

export function requireSupabaseAdmin(): SupabaseClient {
  if (!_admin) throw new Error("Supabase admin client not configured (missing SUPABASE_SERVICE_ROLE_KEY)");
  return _admin;
}

/** @deprecated Use requireSupabaseAdmin() for null-safe access */
export const supabaseAdmin = _admin;

export const TABLES = {
  sessions: "payer_claims_analysis_sessions",
  messages: "payer_claims_analysis_messages",
} as const;
