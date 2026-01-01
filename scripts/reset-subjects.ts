/**
 * Reset subjects.json in Blob storage
 * Usage: npx tsx --env-file=.env.local scripts/reset-subjects.ts
 */

import { saveSubjects } from "@/lib/subject-storage";

async function reset() {
  await saveSubjects({});
  console.log("✅ Subjects reset to empty");
}

reset().catch(console.error);

