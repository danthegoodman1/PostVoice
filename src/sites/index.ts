import { Request, Response } from "express";
import { GetSites } from "../db/queries/sites";
import { logger } from "../logger";

export async function HandleListSites(req: Request, res: Response) {
  try {
    const sites = await GetSites(req.auth.userId)
    return res.json({
      sites
    })
  } catch (error) {
    logger.error(error, "error getting sites")
    return res.sendStatus(500)
  }
}
