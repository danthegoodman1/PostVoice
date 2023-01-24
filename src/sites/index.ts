import { Request, Response } from "express";
import { RowsNotFound } from "../db/errors";
import { GetSiteByID, GetSites, InsertSite } from "../db/queries/sites";
import { PostContentType } from "../db/types/site_posts";
import { inngest, PostCreationEvent } from "../inngest";
import { logger } from "../logger";
import { randomID } from "../utils/id";

export async function GetListSites(req: Request, res: Response) {
  try {
    const sites = await GetSites(req.auth.userId)
    return res.json({
      sites
    })
  } catch (error) {
    if (error instanceof RowsNotFound) {
      return res.json({
        sites: []
      })
    }
    logger.error(error, "error listing sites")
    return res.sendStatus(500)
  }
}

interface PostCreateSiteReqBody {
  id: string
  kind: 'custom'
  name: string
}

export async function PostCreateSite(req: Request<{}, {}, PostCreateSiteReqBody>, res: Response) {
  try {
    const siteID = randomID("site_")
    const postKey = randomID("pk_")
    await InsertSite({
      access_token: null,
      id: siteID,
      img_url: null,
      kind: req.body.kind,
      name: req.body.name,
      platform_id: null,
      user_id: req.auth.userId,
      post_key: postKey
    })
    return res.json({
      siteID
    })
  } catch (error) {
    logger.error(error, "error creating site")
    return res.sendStatus(500)
  }
}


interface PostCreatePostReqBody {
  contentType: PostContentType
  content: string
  slug: string
  title: string
  siteID: string
  postKey: string
  postID?: string
}

export async function PostCreatePost(req: Request<{}, {}, PostCreatePostReqBody>, res: Response) {
  try {
    // Verify site exists and auth post key
    const site = await GetSiteByID(req.body.siteID)
    if (site.post_key !== req.body.postKey) {
      return res.status(401).send("invalid post key")
    }

    // Send create post event
    await inngest.send("api/post.generate", {
      data: {
        contentType: req.body.contentType,
        kind: "custom",
        postContent: req.body.content,
        postID: req.body.postID || randomID(""),
        slug: req.body.slug,
        postTitle: req.body.title,
        siteID: site.id,
        encWfToken: site.access_token,
        reqID: req.id
      } as PostCreationEvent
    })
    return res.sendStatus(201)
  } catch (error) {
    if (error instanceof RowsNotFound) {
      return res.status(404).send("site not found")
    }
    logger.error(error, "error creating post")
    return res.sendStatus(500)
  }
}
