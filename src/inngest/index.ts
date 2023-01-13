import { Inngest } from "inngest"
import Webflow from "webflow-api"
import { logger, logMsgKey } from "../logger"
import md5 from 'md5'

export const inngest = new Inngest({ name: "PostVoice" })

export const RegisterWebflowWebhooks = inngest.createStepFunction("Webflow Register Webhooks", "api/webflow.register_webhooks", async ({ event, tools }) => {
  logger.debug({
    [logMsgKey]: "running RegisterWebflowWebhooks",
    data: event.data
  })

  const wf = new Webflow({ token: process.env.TEMP_TOKEN })

  tools.run("register collection_item_created", async () => {
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_created",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_created`
    })
    logger.debug("registered collection_item_created")
  })
  tools.run("register collection_item_changed", async () => {
    await wf.createWebhook({
      siteId: event.data.siteID,
      triggerType: "collection_item_changed",
      url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_changed`
    })
    logger.debug("registered collection_item_changed")
  })
  logger.debug("done RegisterWebflowWebhooks")
})

export const HandleWebflowCollectionItemCreation = inngest.createStepFunction("Webflow Collection Item Creation", "api/webflow.collection_item_created", async ({ event, tools }) => {
  logger.debug('running HandleWebflowItemCreation step function')
  // TESTING STUFF
  const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
  const cmsItem = await wf.item({
    collectionId: event.data.whPayload._cid,
    itemId: event.data.whPayload._id
  })
  console.log('cmsItem:', cmsItem)

  const originalHash = tools.run("Get original content hash", async () => {
    const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
    const cmsItem = await wf.item({
      collectionId: event.data.whPayload._cid,
      itemId: event.data.whPayload._id
    })
    return md5((cmsItem as any)['post-body'])
  })

  console.log('got original hash', originalHash)

  // TODO: actual stuff
  // Record the new item in DB
  // Check if we already have the item in the DB?
  // Fetch item content and calculate hash (tools.run)
  // Split item content into parts
    // if any part is longer than 3k chars error log
    // if we have no sentences, error log and exit
  // for each sentence:
    // synth audio
    // store in s3
    // write file name to map
  // pull all files to disk and combine to single file
  // write new single file to s3
  // Write audio path in db
  // delete audio parts from s3
  // get the cms item again, verify we have same hash
  // if same hash then inject code and edit cms item in webflow
})
