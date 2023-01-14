import { pool } from ".."

export async function InsertUser(userID: string) {
  await pool.query(`INSERT INTO users (id) VALUES ($1)`, [userID])
  return
}
