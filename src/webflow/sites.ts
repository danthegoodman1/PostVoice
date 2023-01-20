import Webflow from "webflow-api";
import { Site } from 'webflow-api/dist/api'
import { pool } from "../db";
import { decrypt } from "../utils/crypto";

export interface SiteWithToken extends Site {
  token_id: string
}

/**
 * Fetches available sites with the tokens currently known
 */
export async function ListAvailableWebflowSitesForTokens(userID: string): Promise<SiteWithToken[]> {
  const encTokens = (await pool.query(`SELECT id, access_token from webflow_access_tokens WHERE user_id = $1`, [userID])).rows
  const tokens = encTokens.map((encTok) => {
    return {access_token: decrypt(encTok, process.env.CRYPTO_KEY!), id: encTok.id}
  })
  const sites: SiteWithToken[] = []
  for (const token of tokens) {
    const wf = new Webflow({
      token: token.access_token
    })
    const wfSites = await wf.sites()
    for (const wfSite of wfSites) {
      if (!sites.some((site) => site._id === wfSite._id)) {
        sites.push({
          ...wfSite,
          token_id: token.id
        } as SiteWithToken)
      }
    }
  }

  return sites
}
