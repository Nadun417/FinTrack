import { createClient } from "@supabase/supabase-js";
import { appConfig, getConfigError } from "./config.js";

// Do NOT call assertConfig() here — it would throw at module-load time
// and prevent all downstream JS from running (including UI event binding).
// Instead, create the client with whatever values exist (possibly empty strings).
// Actual Supabase calls will fail gracefully at runtime and show a toast.

const configError = getConfigError();

export const supabase = configError
  ? null
  : createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

export { configError };
