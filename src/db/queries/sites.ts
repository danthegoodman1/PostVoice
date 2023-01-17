import Webflow from "webflow-api"
import { pool } from ".."
import { basicInfo } from "../types/base"

export interface GenericSite {
  type: 'webflow'
  img_url: string
  title: string
  id: string
  created_at: Date
  updated_at: Date
}

interface basicSiteInfo {
  id: string
  created_at: Date
  updated_at: Date
  access_token: string
}

export async function GetSites(userID: string): Promise<GenericSite[]> {
  const webflowQuery = await pool.query(`
    SELECT
      id, created_at, updated_at, access_token
    FROM webflow_sites
    WHERE user_id = $1
  `, [userID])
  const webflowSites = webflowQuery.rows as basicSiteInfo[]
  const wf = new Webflow({
    token: webflowSites[0].access_token
  })
  const wfSites = await wf.sites()
  // merge the site info
  const sites: GenericSite[] = []
  for (const wfSite of webflowSites) {
    const matchingSite = wfSites.filter((site) => wfSite.id == site._id)
    if (matchingSite) {
      sites.push({
        created_at: wfSite.created_at,
        id: wfSite.id,
        updated_at: wfSite.updated_at,
        type: 'webflow',
        img_url: matchingSite[0].previewUrl,
        title: matchingSite[0].name
      })
    }
  }
  return sites
}
