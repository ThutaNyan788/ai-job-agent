import "../server/env";
import { closeDatabase, db, jobPosts } from "../harness/db";
import { JOB_POSTS } from "../harness/job-seed";
import { sql } from "drizzle-orm";

try {
  await db
    .insert(jobPosts)
    .values(JOB_POSTS.map((data) => ({ id: data.id, data })))
    .onConflictDoUpdate({
      target: jobPosts.id,
      set: { data: sql`excluded.data` },
    });
  console.log(`Seeded ${JOB_POSTS.length} job posts.`);
} finally {
  await closeDatabase();
}
