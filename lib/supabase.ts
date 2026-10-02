import { createClient } from "@supabase/supabase-js";

import { auth } from "@/lib/firebase";

const SUPABASE_URL = "https://wfmokinfcypfpdisussw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-EhpFuhIJnz_9RktadwHug_7RvZQv6G";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    accessToken: async () =>
      (await auth.currentUser?.getIdToken(false)) ?? null,
  },
);
