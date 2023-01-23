import { pool } from "..";
import { SynthesisJob } from "../types/synthesis_jobs";

export async function InsertSynthesisJob(params: SynthesisJob) {
  return await pool.query(`INSERT INTO synthesis_jobs (user_id, id, ms, chars, site_id, post_slug) VALUES ($1, $2, $3, $4, $5, $6)`, [params.user_id, params.id, params.ms, params.chars, params.site_id, params.post_slug])
}

// TODO: Need index (or using ksuid?)
export async function ListSynthesisJobs(userID: string, offset?: Date) {
  const params: any[] = [userID]
  if (offset) {
    params.push(offset)
  }
  const q = await pool.query(`SELECT * FROM synthesis_jobs WHERE user_id = $1 ${offset ? 'AND created_at < $2' : ''} ORDER BY created_at DESC LIMIT 10`, params)
  return q.rows as SynthesisJob[]
}

// TODO: Need index
export async function SumSynthJobForRange(userID: string, start: Date, end: Date) {
  const q = await pool.query(`SELECT SUM(ms) as total_ms, SUM(chars) as total_chars FROM synthesis_jobs WHERE user_id = $1 AND created_at >= $2 AND end < $3`, [userID, start, end])
  return {
    total_ms: q.rows[0].total_ms,
    total_chars: q.rows[0].total_chars
  }
}
