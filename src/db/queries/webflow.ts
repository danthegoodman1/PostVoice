import { pool } from "..";
import { WebflowAccessToken } from "../types/webflow";

export async function InsertWebflowAccessToken(params: WebflowAccessToken) {
  return await pool.query(`INSERT INTO webflow_access_tokens (user_id, id, access_token) VALUES ($1, $2, $3)`, [
    params.user_id, params.id, params.access_token
  ])
}
