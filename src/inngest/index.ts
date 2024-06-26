import { Inngest } from "inngest"
import Webflow from "webflow-api"
import * as cheerio from "cheerio"
import md5 from "md5"
import TextToSpeech from '@google-cloud/text-to-speech'

import { logger, logMsgKey } from "../logger"
import { randomID } from "../utils/id"
import { GetSitePostByID, InsertPost, InsertSite } from "../db/queries/sites"
import { CMSPartTooLong } from "./errors"
import { DeleteS3File, DownloadS3File, UploadS3FileBuffer, UploadS3FileStream } from "../storage"
import { createReadStream, createWriteStream } from "fs"
import { execShellCommand } from "../utils/exec"
import { unlink } from "fs/promises"
import { GetUser, InsertUser } from "../db/queries/user"
import { decrypt } from "../utils/crypto"
import { InsertSynthesisJob } from "../db/queries/synthesis_jobs"
import { RowsNotFound } from "../db/errors"
import { BuildWebflowPostID, BuildWebflowSiteID } from "../utils/webflow"
import { User } from "../db/types/user"
import { SitePost } from "../db/types/site_posts"

export const inngest = new Inngest({ name: "PostVoice" })

export const ttsClient = new TextToSpeech.TextToSpeechClient()

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

export const HandleWebflowCollectionItemCreation = inngest.createStepFunction({
  name: "Webflow Collection Item Creation",
  retries: 20
}, "api/webflow.collection_item_created", async ({ event, tools }) => {
  logger.debug("running HandleWebflowItemCreation step function")

  // Check if item exists
  const post = tools.run("Check if CMS item exists in DB", async () => {
    try {
      const post = await GetSitePostByID(event.data.siteID, BuildWebflowPostID(event.data.whPayload._cid, event.data.whPayload._id))
      return post
    } catch (error) {
      if (error instanceof RowsNotFound) {
        return null
      }
      logger.error(error)
      throw error
    }
  }) as SitePost | null

  if (post !== null) {
    // TODO: We need to see if the content changed
      // TODO: If changed, we regenerate
      // TODO: If not changed, abort
    logger.warn({
      [logMsgKey]: "CMS item already exists in DB, aborting",
      eventData: event.data
    })
    return
  }

  const originalHash = tools.run("Get original content hash", async () => {
    try {
      logger.debug("getting original content hash")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      const cmsItem = await wf.item({
        collectionId: event.data.whPayload._cid,
        itemId: event.data.whPayload._id
      })
      const originalHash = md5((cmsItem as any)["post-body"])
      logger.debug(`got original hash: ${originalHash}`)
      return originalHash
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  const user = tools.run("get user info", async () => {
    return await GetUser(post!.user_id)
  }) as User

  const postParts = tools.run("Split post into parts", async () => {
    try {
      logger.debug("splitting post into parts")
      const wf = new Webflow({ token: decrypt(event.data.encWfToken, process.env.CRYPTO_KEY!) })
      const cmsItem = await wf.item({
        collectionId: event.data.whPayload._cid,
        itemId: event.data.whPayload._id
      })
      const postBody = (cmsItem as any)["post-body"]

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
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  if (postParts.length === 0) {
    logger.warn("post had no parts, exiting")
    return
  }

  const itemParts: {partID: string, audioPath: string, synthTimeMS: number, chars: number}[] = []
  for (let i = 0; i < postParts.length; i++) {
    const [partID, durationMS, chars] = tools.run("Synthesize audio part", async () => {
      try {
        logger.debug(`splitting part ${i}`)
        const partID = randomID("audpart_")

        // Synthesize speech
        const start = new Date().getTime()
        const [response] = await ttsClient.synthesizeSpeech({
          input: {text: postParts[i]},
          voice: {
            name: "en-US-Neural2-G",
            languageCode: "en-US"
          },
          audioConfig: {
            audioEncoding: "LINEAR16"
          }
        })
        const duration = new Date().getTime() - start
        logger.debug("synthesized speech for part")

        // Upload audio file to s3
        await UploadS3FileBuffer("parts/" + partID + ".mp3", Buffer.from(response.audioContent as Uint8Array))
        logger.debug("uploaded part to s3")

        return [partID, duration, postParts[i].length]
      } catch (error) {
        logger.error(error)
        throw error
      }
    })

    itemParts.push({
      partID: partID as string,
      audioPath: "parts/" + partID + ".mp3",
      synthTimeMS: durationMS as number,
      chars: chars as number
    })
  }

  const finalFileID = tools.run("Generate final file id", () => {
    return randomID("")
  })

  // combine all parts to single file, write new single file to s3, record in db
  const finalFilePath = tools.run("Combine audio parts to single file", async () => {

    try {
      logger.debug("combining audio parts")
      const finalFilePath = `synth/${finalFileID}.mp3`
      const partFileNames = []
      for (let i = 0; i < itemParts.length; i++) {
        const fileName = `/tmp/${finalFileID}_${i}.mp3`
        const paddedFile = `/tmp/${finalFileID}_${i}_pad.mp3`
        partFileNames.push(fileName)

        // Download the file
        const ws = createWriteStream(fileName)
        await DownloadS3File(itemParts[i].audioPath, ws)
        logger.debug("downloaded part from s3")

        // // Add one second of silence to end of file
        // await execShellCommand(`ffmpeg -i ${fileName} -af "apad=pad_dur=0.1" ${paddedFile}`)
        // logger.debug("appended silence")

        // // Remove the old file
        // await unlink(fileName)

        logger.debug("deleting local parts")
      }

      // Concat the parts
      const finalFile = `/tmp/${finalFileID}.mp3`
      await execShellCommand(`ffmpeg ${partFileNames.map(f => `-i ${f}`).join(" ")} -filter_complex "${partFileNames.map((f, i) => `[${i}:a]`).join("")}concat=n=${partFileNames.length}:v=0:a=1" ${finalFile}`)
      logger.debug("merged parts")

      const rs = createReadStream(finalFile)
      await UploadS3FileStream(finalFilePath, rs)
      logger.debug("uploaded final audio file to s3")

      for (let i = 0; i < partFileNames.length; i++) {
        await unlink(partFileNames[i])
        await DeleteS3File(itemParts[i].audioPath)
      }
      logger.debug("deleted local padded parts")

      await unlink(finalFile)

      return finalFilePath
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // Record cms item into DB
  tools.run("Record new Webflow CMS item", async () => {
    try {
      logger.debug("inserting new webflow cms item to DB")
      await InsertPost({
        audio_path: finalFilePath,
        id: BuildWebflowPostID(event.data.whPayload._cid, event.data.whPayload._id),
        md5: originalHash,
        site_id: event.data.siteID,
        title: event.data.whPayload.name,
        user_id: user.id,
        slug: event.data.whPayload.slug,
        site_platform_id: BuildWebflowPostID(event.data.whPayload._cid, event.data.whPayload._id)
      })
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // Record synth run
  tools.run("Record new Synthesis Job", async () => {
    try {
      await InsertSynthesisJob({
        audio_path: finalFilePath,
        chars: itemParts.reduce((accumulator, item) => accumulator + item.chars, 0),
        ms: itemParts.reduce((accumulator, item) => accumulator + item.synthTimeMS, 0),
        id: randomID("job_"),
        job: `webflow/${event.data.siteID}/${event.data.whPayload.slug}`,
        user_id: user.id
      })
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  logger.debug("done webflow collection item creation")
})

export const HandleWebflowDeleteItem = inngest.createStepFunction("Webflow Collection Item Delete", "api/webflow.collection_item_deleted", async ({ event, tools }) => {
  // TODO: Delete file from DB
  // TODO: Delete file from S3
})
