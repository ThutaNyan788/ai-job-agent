import "../server/env";
import { closeDatabase, db, jobPosts } from "../harness/db";
import { JOB_POSTS } from "../harness/job-seed";
import { sql } from "drizzle-orm";

// The company account that owns every seeded job post. These show up in that
// account's company dashboard via listJobsForCompany().
const SEED_OWNER_USER_ID = "PMed61NZCbuzLMfo9nUQcRQr8qsd8mRt";

try {
  await db
    .insert(jobPosts)
    .values(JOB_POSTS.map((data) => ({ id: data.id, ownerUserId: SEED_OWNER_USER_ID, data })))
    .onConflictDoUpdate({
      target: jobPosts.id,
      set: { ownerUserId: sql`excluded.owner_user_id`, data: sql`excluded.data` },
    });
  console.log(`Seeded ${JOB_POSTS.length} job posts owned by ${SEED_OWNER_USER_ID}.`);
} finally {
  await closeDatabase();
}
