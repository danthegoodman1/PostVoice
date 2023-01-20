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
import { HandleWebflowCollectionItemCreation, inngest, CreateWebflowSite, HandleWebflowDeleteItem } from "./inngest"
import { decrypt, encrypt } from "./utils/crypto"
import { GetSiteByID } from "./db/queries/sites"
import WHHandler from "./clerk/wh_handlers"
import { InvalidWebhookAuth } from "./clerk/errors"
import { HandleListSites } from "./sites"
import { randomID } from "./utils/id"
import { ListAvailableWebflowSitesForTokens } from "./webflow/sites"
import { GetWebflowToken, InsertWebflowAccessToken } from "./db/queries/webflow"

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

const listenPort = process.env.PORT || "8080"

const webflow = new Webflow()

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

  const inngestMiddleware = serve("PostVoice", [HandleWebflowCollectionItemCreation, CreateWebflowSite, HandleWebflowDeleteItem])
  app.use("/inngest", inngestMiddleware)

  // Webflow endpoints
  const webflowRouter = express.Router()
  webflowRouter.get("/authorize", (req, res) => {
    const url = webflow.authorizeUrl({
      client_id: process.env.WEBFLOW_CLIENT_ID!,
      redirect_uri: process.env.API_URL + "/webflow/token"
    })
    res.json({url})
  })
  webflowRouter.get("/token", ClerkExpressRequireAuth(), async (req: Request<{}, {}, {}, {code: string}>, res: Response) => {
    const { access_token } = await webflow.accessToken({
      client_id: process.env.WEBFLOW_CLIENT_ID!,
      client_secret: process.env.WEBFLOW_CLIENT_SECRET!,
      code: req.query.code,
      redirect_uri: process.env.API_URL + "/webflow/token"
    })

    await InsertWebflowAccessToken({
      id: randomID("wftok_"),
      access_token: encrypt(access_token),
      user_id: req.auth.userId
    })

    console.log('token', access_token)
    const wf = new Webflow({ token: access_token });
    const { user } = await wf.authenticatedUser()
    console.log(user)
    const sites = await wf.sites()
    console.log(sites)
    res.redirect(`${process.env.FE_URL}/sites?action=add_webflow`)
  })
  webflowRouter.post("/wh/:siteID/:event", async (req: Request<{siteID: string, event: string}, {}, {}>, res) => {
    console.log('got webhook event', req.params.event, req.body)
    const site = await GetSiteByID(req.params.siteID)
    switch (req.params.event) {
      case "collection_item_created":
        await inngest.send("api/webflow.collection_item_created", {
          data: {
            whPayload: req.body,
            siteID: req.params.siteID,
            encWfToken: site.access_token
          }
        })
        logger.debug('sent inngest event')
        break;
      case "collection_item_changed":
        await inngest.send("api/webflow.collection_item_changed", {
          data: {
            whPayload: req.body,
            siteID: req.params.siteID,
            encWfToken: site.access_token
          }
        })
        break;

      default:
        break;
    }

    res.sendStatus(200)
  })
  webflowRouter.get("/sites", ClerkExpressRequireAuth(), async (req, res) => {
    try {
      const sites = await ListAvailableWebflowSitesForTokens(req.auth.userId)
      return res.json({
        sites
      })
    } catch (error) {
      logger.error(error, "error getting sites")
      return res.sendStatus(500)
    }
  })
  webflowRouter.post("/sites/add", ClerkExpressRequireAuth(), async (req: Request<{}, {}, {tokenID: string, siteID: string}>, res: Response) => {
    try {
      const token = await GetWebflowToken(req.auth.userId, req.body.tokenID)
      const wf = new Webflow({
        token: decrypt(token.access_token)
      })

      const site = await wf.site({
        siteId: req.body.siteID
      })

      const siteID = randomID("site_")

      await inngest.send("api/webflow.create_site", {
        data: {
          whPayload: req.body,
          site: site,
          siteID,
          encWfToken: token.access_token
        }
      })
      return res.send("added")
    } catch (error) {
      logger.error(error, "error getting sites")
      return res.sendStatus(500)
    }
  })
  app.use("/webflow", webflowRouter)

  const clerkRouter = express.Router()
  clerkRouter.post("/wh", (req, res) => {
    try {
      return WHHandler(req, res)
    } catch (error) {
      if (error instanceof InvalidWebhookAuth) {
        return res.sendStatus(401)
      }
      logger.error({
        error
      }, "error handling clerk webhook")
      return res.sendStatus(500)
    }
  })
  app.use("/clerk", clerkRouter)

  const siteRouter = express.Router()
  siteRouter.use(ClerkExpressRequireAuth())
  siteRouter.get("/", HandleListSites)
  app.use("/sites", siteRouter)

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
