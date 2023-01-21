import { Request, Response } from "express";
import { GetSites, InsertSite } from "../db/queries/sites";
import { PostContentType } from "../db/types/site_posts";
import { logger } from "../logger";
import { randomID } from "../utils/id";

export async function GetListSites(req: Request, res: Response) {
  try {
    const sites = await GetSites(req.auth.userId)
    return res.json({
      sites
    })
  } catch (error) {
    logger.error(error, "error getting sites")
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
    await InsertSite({
      access_token: null,
      id: siteID,
      img_url: null,
      kind: req.body.kind,
      name: req.body.name,
      platform_id: null,
      user_id: req.auth.userId
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
}

export async function PostCreatePost(req: Request<{siteID: string}, {}, PostCreatePostReqBody>, res: Response) {
  const postID = randomID("post_")
  // TODO: Verify site exists?
  // TODO: launch create post event
}
