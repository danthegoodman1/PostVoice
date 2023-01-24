import { pool } from ".."
import { RowsNotFound } from "../errors";
import { Site } from "../types/sites"
import { SitePost } from "../types/site_posts";

export async function GetSites(userID: string): Promise<Site[]> {
  const q = await pool.query(`
    SELECT *
    FROM sites
    WHERE user_id = $1
  `, [userID])
  if (q.rowCount === 0) {
    throw new RowsNotFound()
  }
  return q.rows
}


export interface InsertSiteParams {
  EncryptedAccessToken: string

}

export async function InsertSite(params: Site) {
  await pool.query(`INSERT INTO sites (user_id, id, access_token, platform_id, img_url, name, kind, post_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [params.user_id, params.id, params.access_token, params.platform_id, params.img_url, params.name, params.kind, params.post_key])
  return
}

export async function InsertPost(params: SitePost) {
  await pool.query(`INSERT INTO site_posts (user_id, site_id, id, site_platform_id, title, md5, slug) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [params.user_id, params.site_id, params.id, params.site_platform_id, params.title, params.md5, params.slug])
  return
}

export async function UpdatePost(siteID: string, slug: string, md5: string) {
  await pool.query(`UPDATE site_posts SET md5 = $3 WHERE site_id = $1 AND slug = $2`, [siteID, slug, md5])
  return
}

export async function GetSiteByID(siteID: string): Promise<Site> {
  const query = await pool.query(`SELECT * FROM sites WHERE id = $1`, [siteID])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0] as Site
}

export async function GetSitePostBySlug(siteID: string, slug: string): Promise<SitePost> {
  const query = await pool.query(`SELECT * FROM site_posts WHERE site_id = $1 AND slug = $2`, [siteID, slug])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0] as SitePost
}
