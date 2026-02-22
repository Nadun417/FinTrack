const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

function readEnv(name) {
  return import.meta.env[name];
}

let _configError = null;

(function _checkConfig() {
  const missing = REQUIRED_ENV.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    _configError = `Missing required environment variables: ${missing.join(", ")}.\nPlease create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`;
  }
})();

/**
 * Returns the config error message, or null if config is valid.
 * Call this at runtime (not module-load) so importing this module never throws.
 */
export function getConfigError() {
  return _configError;
}

/**
 * Throws if config is invalid. Use this as a runtime guard before Supabase calls.
 */
export function assertConfig() {
  if (_configError) {
    throw new Error(_configError);
  }
}

export const appConfig = {
  supabaseUrl: readEnv("VITE_SUPABASE_URL") || "",
  supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY") || "",
};
