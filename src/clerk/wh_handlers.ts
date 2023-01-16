import { Request, Response } from "express";
import { InsertUser } from "../db/queries/user";
import { logger } from "../logger";
import {Webhook} from 'svix'
import { InvalidWebhookAuth } from "./errors";

interface ClerkWHEvent {
  object: string
  type: string
  data: any
}

export default async function WHHandler(req: Request, res: Response) {
  // Verify the webhook

  const wh = new Webhook(process.env.CLERK_WH_SECRET!)
  let payload: ClerkWHEvent
  try {
    payload = wh.verify(req.body, req.headers as any) as ClerkWHEvent
  } catch (error) {
    throw new InvalidWebhookAuth()
  }

  logger.debug({
    body: payload
  }, "got clerk webhook")
  switch (payload.type) {
    case "user.created":
      await InsertUser(payload.data.id)
      break

    default:
      logger.warn("webhook not setup for " + payload.type)
      break
  }
  return res.sendStatus(200)
}
