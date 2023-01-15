import { pool } from "..";
import { logger, logMsgKey } from "../../logger";
import { SynthesisJob } from "../types/synthesis_jobs";

export async function InsertSynthesisJob(synth: SynthesisJob) {
  logger.debug({
    [logMsgKey]: "inserting synthesis job",
    synth
  })
  return await pool.query(`INSERT INTO synthesis_jobs (user_id, id, ms, chars, job, audio_path)`, [synth.user_id, synth.id, synth.ms, synth.chars, synth.job, synth.audio_path])
}
