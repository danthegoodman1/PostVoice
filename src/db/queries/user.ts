import { pool } from ".."
import { logger } from "../../logger"

export async function InsertUser(userID: string) {
  logger.debug("inserting user " + userID)
  await pool.query(`INSERT INTO users (id) VALUES ($1)`, [userID])
  return
}
