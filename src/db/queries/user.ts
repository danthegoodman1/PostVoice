import { pool } from ".."
import { logger } from "../../logger"
import { RowsNotFound } from "../errors"
import { User } from "../types/user"

export async function InsertUser(userID: string) {
  logger.debug("inserting user " + userID)
  await pool.query(`INSERT INTO users (id) VALUES ($1)`, [userID])
  return
}

export async function GetUser(id: string): Promise<User> {
  const query = await pool.query(`SELECT * FROM users WHERE id = $1`, [id])
  if (query.rowCount === 0) {
    throw new RowsNotFound()
  }
  return query.rows[0]
}
