const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

function readEnv(name) {
  return import.meta.env[name];
}

export function assertConfig() {
  const missing = REQUIRED_ENV.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export const appConfig = {
  supabaseUrl: readEnv("VITE_SUPABASE_URL") || "",
  supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY") || "",
};
