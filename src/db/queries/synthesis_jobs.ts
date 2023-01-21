import { pool } from "..";
import { logger, logMsgKey } from "../../logger";
import { SynthesisJob } from "../types/synthesis_jobs";

export async function InsertSynthesisJob(params: SynthesisJob) {
  logger.debug({
    [logMsgKey]: "inserting synthesis job",
    params
  })
  return await pool.query(`INSERT INTO synthesis_jobs (user_id, id, ms, chars, site_id, post_slug, audio_path)`, [params.user_id, params.id, params.ms, params.chars, params.site_id, params.post_slug, params.audio_path])
}
