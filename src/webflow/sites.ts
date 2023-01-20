import Webflow from "webflow-api";
import { Site } from 'webflow-api/dist/api'
import { pool } from "../db";
import { decrypt } from "../utils/crypto";

/**
 * Fetches available sites with the tokens currently known
 */
export async function ListAvailableWebflowSitesForTokens(userID: string): Promise<Site[]> {
  const encTokens = (await pool.query(`SELECT access_token from webflow_access_tokens WHERE user_id = $1`, [userID])).rows
  const tokens = encTokens.map((encTok) => decrypt(encTok, process.env.CRYPTO_KEY!))
  const sites: Site[] = []
  for (const token of tokens) {
    const wf = new Webflow({
      token
    })
    const wfSites = await wf.sites()
    for (const wfSite of wfSites) {
      if (!sites.some((site) => site._id === wfSite._id)) {
        sites.push(wfSite)
      }
    }
  }

  return sites
}
