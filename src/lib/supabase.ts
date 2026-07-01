import { createClient } from "@supabase/supabase-js";

export function normalizeSupabaseProjectUrl(value: string | undefined) {
  const rawValue = value?.trim() ?? "";
  if (!rawValue) {
    return "";
  }

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    return rawValue;
  }

  const knownServicePaths = ["/auth/v1", "/rest/v1", "/storage/v1", "/functions/v1", "/realtime/v1"];
  const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase();
  const servicePath = knownServicePaths.find((path) => normalizedPath.endsWith(path));

  if (servicePath) {
    url.pathname = url.pathname.slice(0, url.pathname.length - servicePath.length) || "/";
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

const supabaseUrl = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
