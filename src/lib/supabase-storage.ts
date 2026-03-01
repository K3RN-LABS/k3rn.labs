import { createSupabaseAdmin } from "./supabase"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "exports"

export async function uploadExportZip(
  dossierId: string,
  buffer: Buffer
): Promise<string> {
  const supabase = createSupabaseAdmin()
  const path = `${dossierId}/export-${Date.now()}.zip`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/zip",
    upsert: true,
  })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

export async function getSignedExportUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data) throw new Error(`Failed to generate signed URL: ${error?.message}`)
  return data.signedUrl
}
