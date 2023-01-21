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

import { RowsNotFound } from "../errors";
import { Site } from "../types/sites"
import { SitePost } from "../types/site_posts";

export interface InsertSiteParams {
  EncryptedAccessToken: string

}

export async function InsertSite(params: Site) {
  await pool.query(`INSERT INTO sites (user_id, id, access_token, platform_id, img_url, name, kind, collection_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [params.user_id, params.id, params.access_token, params.platform_id, params.img_url, params.name, params.kind])
  return
}

export async function InsertPost(params: SitePost) {
  await pool.query(`INSERT INTO site_posts (user_id, site_id, id, site_platform_id, title, audio_path, md5, slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [params.user_id, params.site_id, params.id, params.site_platform_id, params.title, params.audio_path, params.md5, params.slug])
  return
}

export async function GetSiteByID(siteID: string): Promise<Site> {
  const query = await pool.query(`SELECT * FROM sites WHERE id = $1`, [siteID])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0] as Site
}

export async function GetSitePostByID(siteID: string, id: string): Promise<SitePost> {
  const query = await pool.query(`SELECT * FROM site_posts WHERE id = $1 AND site_id = $2`, [siteID, id])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0] as SitePost
}
