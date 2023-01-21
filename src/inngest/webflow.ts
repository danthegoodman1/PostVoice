import { Inngest } from "inngest"
import Webflow from "webflow-api"
import { PostCreationEvent } from "."
import { InsertSite } from "../db/queries/sites"
import { Site } from "../db/types/sites"

import { logger, logMsgKey } from "../logger"
import { decrypt } from "../utils/crypto"
import { BreakdownWebflowSiteID, BuildWebflowPostID, BuildWebflowPostSlug, BuildWebflowSiteID } from "../utils/webflow"

export const inngest = new Inngest({ name: "PostVoice" })

export const CreateWebflowSite = inngest.createStepFunction({
  name: "Create Webflow Site",
  retries: 20
}, "api/webflow.create_site", async ({ event, tools }) => {

  let log = logger.child({
    reqID: event.data.reqID,
    inngestStepFunction: "Create Webflow Site"
  })

  // log.debug({
  //   [logMsgKey]: "running CreateWebflowSite workflow",
  //   data: event.data
  // })

  // Store the site
  tools.run("store new site info", async () => {
    const stepLog = log.child({
      inngestStep: 'store new site info'
    })
    try {
      stepLog.debug("running step")
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
      log.error(error)
      throw error
    }
  })

  // TODO: Update the webhook url
  // Create webhooks
  tools.run("register collection_item_created", async () => {
    const stepLog = log.child({
      inngestStep: 'register collection_item_created'
    })
    try {
      stepLog.debug("running step")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.site._id,
        triggerType: "collection_item_created",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_created`
      })
      stepLog.debug("registered collection_item_created")
    } catch (error) {
      stepLog.error(error)
      throw error
    }
  })
  tools.run("register collection_item_changed", async () => {
    const stepLog = log.child({
      inngestStep: 'register collection_item_changed'
    })
    try {
      stepLog.debug("running step")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.site._id,
        triggerType: "collection_item_changed",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_changed`
      })
      stepLog.debug("registered collection_item_changed")
    } catch (error) {
      stepLog.error(error)
      throw error
    }
  })
  tools.run("register collection_item_deleted", async () => {
    const stepLog = log.child({
      inngestStep: 'register collection_item_deleted'
    })
    try {
      stepLog.debug("running step")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.site._id,
        triggerType: "collection_item_deleted",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_deleted`
      })
      stepLog.debug("registered collection_item_deleted")
    } catch (error) {
      stepLog.error(error)
      throw error
    }
  })
  tools.run("register collection_item_unpublished", async () => {
    const stepLog = log.child({
      inngestStep: 'register collection_item_unpublished'
    })
    try {
      stepLog.debug("running step")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      await wf.createWebhook({
        siteId: event.data.site._id,
        triggerType: "collection_item_unpublished",
        url: process.env.API_URL + `/wh/webflow/${event.data.siteID}/collection_item_unpublished`
      })
      stepLog.debug("registered collection_item_unpublished")
    } catch (error) {
      stepLog.error(error)
      throw error
    }
  })

  log.debug("done CreateWebflowSite workflow")
}, )

export const HandleWebflowDeleteItem = inngest.createStepFunction("Webflow Collection Item Delete", "api/webflow.collection_item_deleted", async ({ event, tools }) => {
  // TODO: Delete file from DB
  // TODO: Delete file from S3
})

export const BackfillWebflowSite = inngest.createStepFunction({
  name: "Backfill Webflow Site",
  retries: 20
}, "api/webflow.site.backfill", async ({ event, tools }) => {
  const site = event.data.site as Site

  let log = logger.child({
    siteID: site.id,
    userID: event.user?.id,
    reqID: event.data.reqID
  })

  let moreItems = true
  let offset = 0
  const pageSize = 10
  while (moreItems) {
    const { incr, maybeMore } = tools.run("handle webflow collection items page", async () => {
      const wf = new Webflow({
        token: decrypt(site.access_token!)
      })
      log.debug({
        offset
      }, "getting collection items")
      const wfSiteInfo = BreakdownWebflowSiteID(site.platform_id!)
      const items = await wf.items({
        collectionId: wfSiteInfo.collectionID,
        limit: 10
      })

      for (const item of items) {
        const postID = BuildWebflowPostID(item._cid, item._id)
        const slug = BuildWebflowPostSlug(item._cid, item.slug)
        log.debug({
          postID,
          slug,
          siteID: site.id
        }, "sending backfilled api/post.created event")
        await inngest.send("api/post.created", {
          data: {
            contentType: "html",
            kind: "webflow",
            postContent: (item as any)["post-body"], // there according to API,
            postID,
            slug,
            postTitle: item.name,
            siteID: site.id,
            encWfToken: site.access_token,
            reqID: "child_" + event.data.reqID
          } as PostCreationEvent
        })
      }

      return {
        incr: offset + pageSize,
        maybeMore: items.length < pageSize
      }
    })

    offset += incr
    moreItems = maybeMore
  }

  log.debug("reached end of items")
})
