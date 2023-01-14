import { Inngest } from "inngest"
import Webflow from "webflow-api"
import { logger, logMsgKey } from "../logger"
import md5 from "md5"
import { randomID } from "../utils/id"
import { InsertWebflowSite } from "../db/queries/webflow"
import * as cheerio from "cheerio"
import { CMSItemChangedDuringProcessing, CMSPartTooLong } from "./errors"

export const inngest = new Inngest({ name: "PostVoice" })

export const CreateWebflowSite = inngest.createStepFunction("Create Webflow Site", "api/webflow.create_site", async ({ event, tools }) => {
  logger.debug({
    [logMsgKey]: "running CreateWebflowSite workflow",
    data: event.data
  })

  // Store the site
  tools.run("store new site info", async () => {
    const userID = randomID("user_")
    await InsertWebflowSite(userID, event.data.siteID)
  })

  // Create webhooks
  tools.run("register collection_item_created", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_created",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_created`
    })
    logger.debug("registered collection_item_created")
  })
  tools.run("register collection_item_changed", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_changed",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_changed`
    })
    logger.debug("registered collection_item_changed")
  })
  tools.run("register collection_item_deleted", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_deleted",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_deleted`
    })
    logger.debug("registered collection_item_deleted")
  })
  tools.run("register collection_item_unpublish", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_unpublish",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_unpublish`
    })
    logger.debug("registered collection_item_unpublish")
  })


  logger.debug("done CreateWebflowSite workflow")
})

export const HandleWebflowCollectionItemCreation = inngest.createStepFunction("Webflow Collection Item Creation", "api/webflow.collection_item_created", async ({ event, tools }) => {
  logger.debug("running HandleWebflowItemCreation step function")
  // TESTING STUFF
  const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
  const cmsItem = await wf.item({
    collectionId: event.data.whPayload._cid,
    itemId: event.data.whPayload._id
  })
  console.log("cmsItem:", cmsItem)

  const originalHash = tools.run("Get original content hash", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    const cmsItem = await wf.item({
      collectionId: event.data.whPayload._cid,
      itemId: event.data.whPayload._id
    })
    return md5((cmsItem as any)["post-body"])
  })

  logger.debug(`got original hash: ${originalHash}`)

  // TODO: Record cms item into DB

  const postParts = tools.run("Split post into parts", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    const cmsItem = await wf.item({
      collectionId: event.data.whPayload._cid,
      itemId: event.data.whPayload._id
    })
    const postBody = (cmsItem as any)["post-body"]

    // TODO: Check if there is an embed already?
    const $ = cheerio.load(postBody)

    const parts = $("html *").contents().map(function() {
        return (this.type === "text") ? $(this).text() : ""
    }).get().filter(i => i !== "")

    const aPartTooLong = parts.some((part) => part.length > 3000)
    if (aPartTooLong) {
      logger.error("cms part too long")
      throw new CMSPartTooLong()
    }

    return parts
  })

  if (postParts.length === 0) {
    logger.warn("post had no parts, exiting")
    return
  }

  const itemPartIDs: {partID: string, audioPath: string}[] = []
  for (let i = 0; i < postParts.length; i++) {
    const partID = tools.run("Synthesize audio part", async () => {
      const partID = randomID("audpart_")

      // TODO: Synthesize speech
      // TODO: Upload audio file
      // TODO: Record in DB with seq number

      return partID
    })

    itemPartIDs.push({
      partID,
      audioPath: process.env.S3_BUCKET + "/parts/" + partID
    })
  }

  // TODO: combine all parts to single file, write new single file to s3, record in db
  
  // TODO: delete audio parts from s3
  
  // get the cms item again, verify we have same hash
  const [currentHash, postBody] = tools.run("Get original content hash", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    const cmsItem = await wf.item({
      collectionId: event.data.whPayload._cid,
      itemId: event.data.whPayload._id
    })
    return [md5((cmsItem as any)["post-body"]), (cmsItem as any)["post-body"]]
  })

  logger.debug(`got original hash: ${currentHash}`)

  if (currentHash !== originalHash) {
    throw new CMSItemChangedDuringProcessing()
  }

  // TODO: inject embed into CMS item and put
})
