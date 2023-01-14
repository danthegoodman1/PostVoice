import { pool } from "..";

export async function InsertWebflowSite(userID: string, siteID: string) {
  await pool.query(`INSERT INTO webflow_sites (user_id, id) VALUES ($1, $2)`, [userID, siteID])
  return
}
