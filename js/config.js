// Preencha com os seus valores. Nunca coloque aqui chaves secretas.
export const CONFIG = {
  SUPABASE_URL: "COLE_AQUI_SUPABASE_URL",
  SUPABASE_ANON_KEY: "COLE_AQUI_SUPABASE_ANON_KEY",
  LIVEKIT_URL: "wss://COLE_AQUI.livekit.cloud",
  TOKEN_ENDPOINT: "https://COLE_AQUI.workers.dev/token",
};

export function isConfigured() {
  return !Object.values(CONFIG).some((v) => String(v).includes("COLE_AQUI"));
}