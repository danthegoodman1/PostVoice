import { Request, Response } from "express";
import { InsertUser } from "../db/queries/user";
import { logger } from "../logger";

interface ClerkWHEvent {
  object: string
  type: string
  data: any
}

export default async function WHHandler(req: Request<{}, {}, ClerkWHEvent>, res: Response) {
  logger.debug({
    body: req.body
  }, "got clerk webhook")
  switch (req.body.type) {
    case "user.created":
      await InsertUser(req.body.data.id)
      break
  
    default:
      logger.warn("webhook not setup for " + req.body.type)
      break
  }
  return res.sendStatus(200)
}
