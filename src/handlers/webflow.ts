import { Request, Response } from "express";
import Webflow from "webflow-api";
import { RowsNotFound } from "../db/errors";
import { GetWebflowToken, InsertWebflowAccessToken } from "../db/queries/webflow";
import { inngest } from "../inngest";
import { logger } from "../logger";
import { decrypt, encrypt } from "../utils/crypto";
import { randomID } from "../utils/id";
import { ListAvailableWebflowSitesForTokens, ListCollectionsForSite } from "../webflow/sites";

export async function GetAuthorize(req: Request, res: Response){
  const webflow = new Webflow()
  const url = webflow.authorizeUrl({
    client_id: process.env.WEBFLOW_CLIENT_ID!,
    redirect_uri: process.env.API_URL + "/webflow/token"
  })
  res.json({url})
}

export async function GetToken(req: Request<{}, {}, {}, {code: string}>, res: Response) {
  const webflow = new Webflow()
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
}

export async function GetSites(req: Request, res: Response) {
  try {
    const sites = await ListAvailableWebflowSitesForTokens(req.auth.userId)
    return res.json({
      sites
    })
  } catch (error) {
    logger.error(error, "error getting sites")
    return res.sendStatus(500)
  }
}

export async function GetSiteCollections(req: Request<{siteID: string}, {}, {}, {tokenID: string}>, res: Response) {
  try {
    const collections = await ListCollectionsForSite(req.auth.userId, req.params.siteID, req.query.tokenID)
    return res.json({
      collections
    })
  } catch (error) {
    if (error instanceof RowsNotFound) {
      return res.status(404).send("token not found")
    }
    logger.error(error, "error getting collections")
    return res.sendStatus(500)
  }
}

export async function PostAddSite(req: Request<{}, {}, { tokenID: string, siteID: string, collectionID: string }>, res: Response) {
  try {
    const token = await GetWebflowToken(req.auth.userId, req.body.tokenID)
    const wf = new Webflow({
      token: decrypt(token.access_token)
    })

    const site = await wf.site({
      siteId: req.body.siteID
    })

    const collection = await wf.collection({
      collectionId: req.body.collectionID
    })

    const siteID = randomID("site_")

    await inngest.send("api/webflow.create_site", {
      data: {
        whPayload: req.body,
        site: site,
        collection: collection,
        siteID,
        encWfToken: token.access_token
      },
      user: {
        id: req.auth.userId
      }
    })
    return res.json({
      siteID
    })
  } catch (error) {
    logger.error(error, "error getting sites")
    return res.sendStatus(500)
  }
}
