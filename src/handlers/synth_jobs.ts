import { Request, Response } from "express";
import { ListSynthesisJobs, SumSynthJobForRange } from "../db/queries/synthesis_jobs";
import { logger } from "../logger";

export async function ListSynthJobs(req: Request<{}, {}, {offset?: string}>, res: Response) {
  try {
    const jobs = await ListSynthesisJobs(req.auth.userId, req.body.offset)
    return res.json({
      jobs
    })
  } catch (error) {
    logger.error(error, "error getting synth jobs")
    return res.sendStatus(500)
  }
}

export async function GetCurrentMonthUsage(req: Request, res: Response) {
  try {
    const now = new Date()
    // Get UTC time
    const start = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1, 0-(now.getTimezoneOffset()/60))
    const end = new Date(now.getUTCFullYear(), now.getUTCMonth()+1, 1, 0-(now.getTimezoneOffset()/60))
    // JS month summing is safe, will rollover
    const jobs = await SumSynthJobForRange(req.auth.userId, start,end)
    return res.json({
      jobs
    })
  } catch (error) {
    logger.error(error, "error getting synth jobs")
    return res.sendStatus(500)
  }
}
