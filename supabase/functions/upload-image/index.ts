import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { handleUpload } from "./handler.mjs";

Deno.serve((request: Request) => handleUpload(request, {
  fetch,
  upload: async (path: string, file: File) => {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Storage is not configured");
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.storage.from("chat-images").upload(path, file, {
      upsert: false, contentType: file.type, cacheControl: "31536000",
    });
    if (error) throw error;
    return admin.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
  },
}));
