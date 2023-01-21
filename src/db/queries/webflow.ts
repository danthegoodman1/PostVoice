import { pool } from "..";
import { RowsNotFound } from "../errors";
import { WebflowAccessToken } from "../types/webflow";

export async function InsertWebflowAccessToken(params: WebflowAccessToken) {
  return await pool.query(`INSERT INTO webflow_access_tokens (user_id, id, access_token) VALUES ($1, $2, $3)`, [
    params.user_id, params.id, params.access_token
  ])
}

export async function GetWebflowToken(userID: string, id: string): Promise<WebflowAccessToken> {
  const query = await pool.query(`SELECT * FROM webflow_access_tokens WHERE user_id = $1 AND id = $2`, [
    userID, id
  ])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0]
}
