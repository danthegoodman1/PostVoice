import { Inngest } from "inngest"
import Webflow from "webflow-api"
import * as cheerio from "cheerio"
import md5 from "md5"
import TextToSpeech from '@google-cloud/text-to-speech'
import { Readable } from 'stream'

import { logger, logMsgKey } from "../logger"
import { randomID } from "../utils/id"
import { InsertWebflowCMSItem, InsertWebflowSite } from "../db/queries/webflow"
import { CMSItemChangedDuringProcessing, CMSPartTooLong } from "./errors"
import { DeleteS3File, DownloadS3File, UploadS3FileBuffer, UploadS3FileStream } from "../storage"
import { createReadStream, createWriteStream } from "fs"
import { execShellCommand } from "../utils/exec"
import { copyFile, unlink } from "fs/promises"
import { InsertUser } from "../db/queries/user"

export const inngest = new Inngest({ name: "PostVoice" })

export const ttsClient = new TextToSpeech.TextToSpeechClient()

export const CreateWebflowSite = inngest.createStepFunction("Create Webflow Site", "api/webflow.create_site", async ({ event, tools }) => {
  logger.debug({
    [logMsgKey]: "running CreateWebflowSite workflow",
    data: event.data
  })

  tools.run("store new site info", async () => {
    // const userID = randomID("user_")
    try {
      await InsertUser("testuser")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // Store the site
  tools.run("store new site info", async () => {
    // const userID = randomID("user_")
    try {
      await InsertWebflowSite("testuser", event.data.siteID)
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // Create webhooks
  tools.run("register collection_item_created", async () => {
    try {
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_created",
        url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_created`
      })
      logger.debug("registered collection_item_created")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_changed", async () => {
    try {
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_changed",
        url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_changed`
      })
      logger.debug("registered collection_item_changed")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_deleted", async () => {
    try {
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_deleted",
        url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_deleted`
      })
      logger.debug("registered collection_item_deleted")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })
  tools.run("register collection_item_unpublished", async () => {
    try {
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
      await wf.createWebhook({
        siteId: event.data.siteID,
        triggerType: "collection_item_unpublished",
        url: process.env.API_URL + `/webflow/wh/${event.data.siteID}/collection_item_unpublished`
      })
      logger.debug("registered collection_item_unpublished")
    } catch (error) {
      logger.error(error)
      throw error
    }
  })


  logger.debug("done CreateWebflowSite workflow")
})

export const HandleWebflowCollectionItemCreation = inngest.createStepFunction("Webflow Collection Item Creation", "api/webflow.collection_item_created", async ({ event, tools }) => {
  logger.debug("running HandleWebflowItemCreation step function")

  const originalHash = tools.run("Get original content hash", async () => {
    try {
      logger.debug("getting original content hash")
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
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


  const postParts = tools.run("Split post into parts", async () => {
    try {
      logger.debug("splitting post into parts")
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
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  if (postParts.length === 0) {
    logger.warn("post had no parts, exiting")
    return
  }

  const itemParts: {partID: string, audioPath: string}[] = []
  for (let i = 0; i < postParts.length; i++) {
    const partID = tools.run("Synthesize audio part", async () => {
      try {
        logger.debug(`splitting part ${i}`)
        const partID = randomID("audpart_")

        // Synthesize speech
        const [response] = await ttsClient.synthesizeSpeech({
          input: {text: postParts[i]},
          voice: {
            name: "en-US-Neural2-G",
            languageCode: "en-US"
          },
          audioConfig: {
            audioEncoding: "LINEAR16",
            sampleRateHertz: 44100
          }
        })
        logger.debug("synthesized speech for part")

        // Upload audio file to s3
        await UploadS3FileBuffer("parts/" + partID + ".mp3", Buffer.from(response.audioContent as Uint8Array))
        logger.debug("uploaded part to s3")

        return partID
      } catch (error) {
        logger.error(error)
        throw error
      }
    })

    itemParts.push({
      partID,
      audioPath: "parts/" + partID + ".mp3"
    })
  }

  // combine all parts to single file, write new single file to s3, record in db
  const finalFileName = tools.run("Combine audio parts to single file", async () => {

    try {
      logger.debug("combining audio parts")
      const tempID = randomID("")
      const finalFileName = `synth/${tempID}.mp3`
      const paddedFiles = []
      for (let i = 0; i < itemParts.length; i++) {
        const fileName = `/tmp/${tempID}_${i}.mp3`
        const paddedFile = `/tmp/${tempID}_${i}_pad.mp3`
        paddedFiles.push(paddedFile)

        // Download the file
        const ws = createWriteStream(fileName)
        await DownloadS3File(itemParts[i].audioPath, ws)
        logger.debug("downloaded part from s3")

        // Add one second of silence to end of file
        await execShellCommand(`ffmpeg -i ${fileName} -af "apad=pad_dur=0.1" ${paddedFile}`)
        logger.debug("appended silence")

        // Remove the old file
        await unlink(fileName)

        logger.debug("deleting local parts")
      }

      // Concat the parts
      const finalFile = `/tmp/${tempID}.mp3`
      await execShellCommand(`ffmpeg ${paddedFiles.map(f => `-i ${f}`).join(" ")} -filter_complex "${paddedFiles.map((f, i) => `[${i}:a]`).join("")}concat=n=${paddedFiles.length}:v=0:a=1" ${finalFile}`)
      logger.debug("merged parts")

      const rs = createReadStream(finalFile)
      await UploadS3FileStream(finalFileName, rs)
      logger.debug("uploaded final audio file to s3")

      for (let i = 0; i < itemParts.length; i++) {
        await unlink(`/tmp/${tempID}_${i}_pad.mp3`)
        await DeleteS3File(itemParts[i].audioPath)
      }
      logger.debug("deleted local padded parts")

      await unlink(finalFileName)

      return finalFileName
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  // get the cms item again, verify we have same hash
  const currentHash = tools.run("Get original content hash", async () => {
    try {
      logger.debug("getting current content hash")
      const wf = new Webflow({ token: event.data.encWfToken }) // TODO: decrypt
      const cmsItem = await wf.item({
        collectionId: event.data.whPayload._cid,
        itemId: event.data.whPayload._id
      })
      const currentHash = md5((cmsItem as any)["post-body"])
      logger.debug(`got current hash: ${currentHash}`)
      return currentHash
    } catch (error) {
      logger.error(error)
      throw error
    }
  })


  if (currentHash !== originalHash) {
    throw new CMSItemChangedDuringProcessing()
  }

  // Record cms item into DB
  tools.run("Record new Webflow CMS item", async () => {
    try {
      logger.debug("inserting new webflow cms item to DB")
      await InsertWebflowCMSItem({
        audio_path: finalFileName,
        id: event.data.whPayload._id,
        md5: currentHash,
        site_id: event.data.siteID,
        title: event.data.whPayload.name,
        user_id: "testuser",
        slug: event.data.whPayload.slug
      })
    } catch (error) {
      logger.error(error)
      throw error
    }
  })

  logger.debug("done webflow collection item creation")
})
