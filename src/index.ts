import * as dotenv from "dotenv"
dotenv.config()

import express, { Request, Response } from "express"
import bunyan from "bunyan"
import { v4 as uuidv4 } from "uuid"
import { createFunction } from "inngest"
import { serve } from "inngest/express"

import { logger } from "./logger"
import { ConnectDB } from "./db"
import Webflow from "webflow-api"
import { HandleWebflowCollectionItemCreation, inngest, RegisterWebflowWebhooks } from "./inngest"

const listenPort = process.env.PORT || "8080"

const webflow = new Webflow()

async function main() {
  const app = express()
  app.use(express.json())
  app.disable("x-powered-by")

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
      req.reqID = reqID
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

  const inngestMiddleware = serve("PostVoice", [HandleWebflowCollectionItemCreation, RegisterWebflowWebhooks])
  app.use("/inngest", inngestMiddleware)

  // Webflow endpoints
  const webflowRouter = express.Router()
  webflowRouter.get("/authorize", (req, res) => {
    const url = webflow.authorizeUrl({
      client_id: process.env.WEBFLOW_CLIENT_ID!,
      redirect_uri: process.env.API_URL + "/webflow/token"
    })
    res.redirect(url)
  })
  webflowRouter.get("/token", async (req: Request<{}, {}, {}, {code: string}>, res: Response) => {
    const { access_token } = await webflow.accessToken({
      client_id: process.env.WEBFLOW_CLIENT_ID!,
      client_secret: process.env.WEBFLOW_CLIENT_SECRET!,
      code: req.query.code,
      redirect_uri: process.env.API_URL + "/webflow/token"
    })

    console.log('token', access_token)
    const wf = new Webflow({ token: access_token });
    const { user } = await wf.authenticatedUser()
    console.log(user)
    const sites = await wf.sites()
    console.log(sites)
    // TODO: Make webhook registration an inngest job
    await inngest.send("api/webflow.register_webhooks", {
      data: {
        whPayload: req.body,
        siteID: sites[0]._id,
        accessToken: access_token
      }
    })
    logger.info("created webhook")
    res.sendStatus(200)
  })
  webflowRouter.post("/wh/:siteID/:event", async (req: Request<{siteID: string, event: string}, {}, {}>, res) => {
    console.log('got webhook event', req.params.event, req.body)
    switch (req.params.event) {
      case "collection_item_created":
        await inngest.send("api/webflow.collection_item_created", {
          data: {
            whPayload: req.body,
            siteID: req.params.siteID
          }
        })
        logger.debug('sent inngest event')
        break;
      case "collection_item_changed":
        await inngest.send("api/webflow.collection_item_changed", {
          data: {
            whPayload: req.body,
            siteID: req.params.siteID
          }
        })
        break;
    
      default:
        break;
    }

    res.sendStatus(200)
  })
  app.use("/webflow", webflowRouter)

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
