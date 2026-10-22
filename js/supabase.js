import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CONFIG, isConfigured } from "./config.js";

export const supabase = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;