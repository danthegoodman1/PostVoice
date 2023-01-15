import { pool } from "..";

export async function InsertSynthesisJob(userID: string, id: string, durationMS: number, chars: number, job: string) {
  return await pool.query(`INSERT INTO synthesis_jobs (user_id, id, ms, chars, job)`, [userID, id, durationMS, chars, job])
}
