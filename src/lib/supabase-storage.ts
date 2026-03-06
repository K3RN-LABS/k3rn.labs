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

const AVATARS_BUCKET = process.env.SUPABASE_STORAGE_AVATARS_BUCKET ?? "Avatars"

export async function uploadAvatar(userId: string, buffer: Buffer, contentType = "image/webp"): Promise<string> {
  const supabase = createSupabaseAdmin()
  const path = `${userId}/avatar.webp`

  const { data, error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true, // remplace la photo existante
  })

  if (error) throw new Error(`Storage avatar upload failed: ${error.message}`)

  // Obtenir l'URL publique
  const { data: publicUrlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return publicUrlData.publicUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin()
  const path = `${userId}/avatar.webp`

  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path])
  if (error) throw new Error(`Storage avatar delete failed: ${error.message}`)
}
