import { pool } from "..";
import { SynthesisJob } from "../types/synthesis_jobs";

export async function InsertSynthesisJob(params: SynthesisJob) {
  return await pool.query(`INSERT INTO synthesis_jobs (user_id, id, ms, chars, site_id, post_slug, audio_path) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [params.user_id, params.id, params.ms, params.chars, params.site_id, params.post_slug, params.audio_path])
}
