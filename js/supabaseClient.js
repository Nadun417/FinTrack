import { createClient } from "@supabase/supabase-js";
import { appConfig, assertConfig } from "./config.js";

assertConfig();

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
