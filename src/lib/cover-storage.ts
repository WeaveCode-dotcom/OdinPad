import { supabase } from "@/integrations/supabase/client";

const BUCKET = "novel-covers";

/** Uploads a JPEG data URL to `novel-covers/{userId}/{novelId}/cover.jpg` and returns the public URL. */
export async function uploadNovelCoverFromDataUrl(userId: string, novelId: string, dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `${userId}/${novelId}/cover.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
