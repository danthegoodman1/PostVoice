import { Inngest } from "inngest"
import Webflow from "webflow-api"
import { InsertSite } from "../db/queries/sites"

import { logger, logMsgKey } from "../logger"
import { decrypt } from "../utils/crypto"
import { BuildWebflowSiteID } from "../utils/webflow"

export const inngest = new Inngest({ name: "PostVoice" })

export const CreateWebflowSite = inngest.createStepFunction({
  name: "Create Webflow Site",
  retries: 20
}, "api/webflow.create_site", async ({ event, tools }) => {
  logger.debug({
    [logMsgKey]: "running CreateWebflowSite workflow",
    data: event.data
  })

  // Store the site
  tools.run("store new site info", async () => {
    try {
      await InsertSite({
        access_token: event.data.encWfToken,
        platform_id: BuildWebflowSiteID(event.data.site._id, event.data.collection._id),
        id: event.data.siteID,
        img_url: event.data.site.previewUrl || null,
        kind: "webflow",
        name: event.data.site.name,
        user_id: event.user!.id,
      })
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // TODO: Update the webhook url
  // Create webhooks
  tools.run("register collection_item_created", async () => {
    try {
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_created",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_created`
      })
      logger.debug("registered collection_item_created")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_changed", async () => {
    try {
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_changed",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_changed`
      })
      logger.debug("registered collection_item_changed")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_deleted", async () => {
    try {
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_deleted",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_deleted`
      })
      logger.debug("registered collection_item_deleted")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_unpublished", async () => {
    try {
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_unpublished",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_unpublished`
      })
      logger.debug("registered collection_item_unpublished")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  logger.debug("done CreateWebflowSite workflow")
}, )

export const HandleWebflowDeleteItem = inngest.createStepFunction("Webflow Collection Item Delete", "api/webflow.collection_item_deleted", async ({ event, tools }) => {
  // TODO: Delete file from DB
  // TODO: Delete file from S3
})
