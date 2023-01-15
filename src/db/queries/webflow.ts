import { pool } from "..";
import { RowsNotFound } from "../errors";
import { WebflowCMSItem, WebflowSite } from "../types/webflow";

export async function InsertWebflowSite(userID: string, siteID: string, encAccessToken: string) {
  await pool.query(`INSERT INTO webflow_sites (user_id, id, access_token) VALUES ($1, $2, $3)`, [userID, siteID, encAccessToken])
  return
}

export async function InsertWebflowCMSItem(item: WebflowCMSItem) {
  await pool.query(`INSERT INTO webflow_cms_items (user_id, site_id, id, title, audio_path, md5, slug, collection_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [item.user_id, item.site_id, item.id, item.title, item.audio_path, item.md5, item.slug, item.collection_id])
  return
}

export async function GetWebflowSiteBySiteID(siteID: string): Promise<WebflowSite> {
  const query = await pool.query(`SELECT * FROM webflow_sites WHERE id = $1`, [siteID])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0] as WebflowSite
}
