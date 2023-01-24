import { Request, Response } from "express";
import { InvalidWebhookAuth } from "../clerk/errors";
import WHHandler from "../clerk/wh_handlers";
import { GetSiteByID } from "../db/queries/sites";
import { inngest, PostCreationEvent } from "../inngest";
import { logger } from "../logger";
import { BuildWebflowPostID, BuildWebflowPostSlug } from "../utils/webflow";

export async function HandleWebflowSiteEvent(req: Request<{siteID: string, event: string}>, res: Response){
  console.log('got webhook event', req.params.event, req.body)
  const postKey = req.query.postKey
  if (!postKey) {
    return res.status(401).send("post key not provided")
  }
  const siteID = req.query.siteID
  if (!siteID || typeof siteID !== 'string') {
    return res.status(400).send("missing siteID")
  }
  const site = await GetSiteByID(siteID)
  if (site.post_key !== postKey) {
    return res.status(403).send("invalid post key")
  }
  switch (req.params.event) {
    case "collection_item_created":
      await inngest.send("api/post.generate", {
        data: {
          contentType: "html",
          kind: "webflow",
          postContent: req.body["post-content"],
          postID: BuildWebflowPostID(req.body._cid, req.body._id),
          slug: BuildWebflowPostSlug(req.body._cid, req.body.slug),
          postTitle: req.body.name,
          siteID: req.params.siteID,
          encWfToken: site.access_token,
          reqID: req.id
        } as PostCreationEvent
      })
      logger.debug('sent inngest event')
      break;
    case "collection_item_changed":
      // TODO: Update
      await inngest.send("api/post.generate", {
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
}

export async function HandleClerkEvent(req: Request, res: Response){
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
}
