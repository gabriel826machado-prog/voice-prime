export const CONFIG = {
  SUPABASE_URL: "https://hbnbcyicrnixqjbkgrrq.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibmJjeWljcm5peHFqYmtncnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTgyODIsImV4cCI6MjEwODI3NDI4Mn0.oyBwB8FltTXjR8DCScGs8OH-E1v5nMaWt1nJzsebj1s",
  LIVEKIT_URL: "wss://salas-chat-f16ybkdr.livekit.cloud",
  TOKEN_ENDPOINT: "https://salas-token.voice-prime.workers.dev",
};

export function isConfigured() {
  return !Object.values(CONFIG).some((v) => String(v).includes("COLE_AQUI"));
}
