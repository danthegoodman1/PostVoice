import { pool } from "..";
import { WebflowCMSItem } from "../types/webflow";

export async function InsertWebflowSite(userID: string, siteID: string) {
  await pool.query(`INSERT INTO webflow_sites (user_id, id) VALUES ($1, $2)`, [userID, siteID])
  return
}

export async function InsertWebflowCMSItem(item: WebflowCMSItem) {
  await pool.query(`INSERT INTO webflow_cms_item (user_id, site_id, id, title, audio_path, md5) VALUES ($1, $2, $3, $4, $5)`, [item.user_id, item.site_id, item.id, item.title, item.audio_path, item.md5])
  return
}
