import * as dotenv from "dotenv"
dotenv.config()

import express, { NextFunction, Request, Response } from "express"
import bunyan from "bunyan"
import { v4 as uuidv4 } from "uuid"
import { serve } from "inngest/express"
import Webflow from "webflow-api"
import {
  ClerkExpressRequireAuth,
  StrictAuthProp,
} from '@clerk/clerk-sdk-node'
import cors from 'cors'


import { logger } from "./logger"
import { ConnectDB } from "./db"
import { HandlePostCreation } from "./inngest"
import { GetListSites, PostCreatePost, PostCreateSite } from "./sites"

import * as WebflowHandlers from "./handlers/webflow"
import * as WebhookHandlers from "./handlers/webhook"
import { BackfillWebflowSite, CreateWebflowSite, HandleWebflowDeleteItem } from "./inngest/webflow"

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {
      id: string
    }
  }
}

const listenPort = process.env.PORT || "8080"

async function main() {
  const app = express()
  app.use(express.json())
  app.disable("x-powered-by")
  app.use(cors())

  const log = bunyan.createLogger({
    name: "PostVoice",
    serializers: bunyan.stdSerializers,
    level: "debug",
  })

  // Connect DB
  try {
    await ConnectDB()
  } catch (error: any) {
    log.error({ m: "failed to connect to db", err: error })
    process.exit(1)
  }

  if (process.env.HTTP_LOG === "1") {
    logger.debug("using HTTP logger")
    app.use((req: any, res, next) => {
      const reqID = uuidv4()
      req.id = reqID
      req.log = log.child({ req_id: reqID }, true)
      req.log.info({ req })
      res.on("finish", () => req.log.info({ res }))
      next()
    })
  }

  app.get("/hc", (req, res) => {
    // let log = GetRequestLogger(req)
    // log.info("hey")
    // log = UpdateRequestLogger(log, {
    //   "test": "pro"
    // })
    // log.info("hey with pro")
    res.sendStatus(200)
  })

  const inngestMiddleware = serve("PostVoice", [HandlePostCreation, CreateWebflowSite, HandleWebflowDeleteItem, BackfillWebflowSite])
  app.use("/inngest", inngestMiddleware)

  // Webflow endpoints
  const webflowRouter = express.Router()
  webflowRouter.get("/authorize", )
  webflowRouter.get("/token", ClerkExpressRequireAuth(), WebflowHandlers.GetToken)
  webflowRouter.get("/sites", ClerkExpressRequireAuth(), WebflowHandlers.GetSites)
  webflowRouter.get("/sites/:siteID/collections", ClerkExpressRequireAuth(), WebflowHandlers.GetSiteCollections)
  webflowRouter.post("/sites/add", ClerkExpressRequireAuth(), WebflowHandlers.PostAddSite)
  webflowRouter.post("/backfill", ClerkExpressRequireAuth(), WebflowHandlers.PostBackfill)
  app.use("/webflow", webflowRouter)

  // Site endpoints
  const siteRouter = express.Router()
  siteRouter.use(ClerkExpressRequireAuth())
  siteRouter.get("/", GetListSites)
  siteRouter.post("/", PostCreateSite)
  siteRouter.post("/:siteID/post", PostCreatePost)
  app.use("/sites", siteRouter)

  // Webhook endpoints
  const webhookHandler = express.Router()
  webhookHandler.post("/webflow/:siteID/:event", WebhookHandlers.HandleWebflowSiteEvent)
  webhookHandler.post("/clerk", WebhookHandlers.HandleClerkEvent)
  app.use("/wh", webhookHandler)

  const server = app.listen(listenPort, () => {
    logger.info(`API listening on port ${listenPort}`)
  })

  let stopping = false

  process.on("SIGTERM", async () => {
    if (!stopping) {
      stopping = true
      logger.warn("Received SIGTERM command, shutting down...")
      server.close()
      logger.info("exiting...")
      process.exit(0)
    }
  })

  process.on("SIGINT", async () => {
    if (!stopping) {
      stopping = true
      logger.warn("Received SIGINT command, shutting down...")
      server.close()
      logger.info("exiting...")
      process.exit(0)
    }
  })
}

main()
