import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Test if column already exists
  const { error: checkError } = await supabase
    .from("Dossier")
    .select("onboardingMessages")
    .limit(1)

  if (!checkError) {
    console.log("✅ Column onboardingMessages already exists — nothing to do")
    return
  }

  console.log("Column missing, running migration...")

  // Use Supabase REST to run the SQL via pg connection
  // Since Supabase doesn't expose exec_sql by default,
  // we use the service role to call the management API
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: `ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "onboardingMessages" JSONB NOT NULL DEFAULT '[]'::jsonb;`,
      }),
    }
  )

  if (res.ok) {
    console.log("✅ Migration successful — onboardingMessages column added")
    return
  }

  // Fallback: try direct pg connection
  console.log("Management API unavailable — use this SQL in the Supabase SQL Editor:")
  console.log("")
  console.log(`ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "onboardingMessages" JSONB NOT NULL DEFAULT '[]'::jsonb;`)
  console.log("")
  console.log("URL: https://supabase.com/dashboard/project/" + projectRef + "/sql")
}

main().catch((e) => {
  console.error("❌ Migration failed:", e.message ?? e)
  process.exit(1)
})
