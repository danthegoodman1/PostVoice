import { Pool } from 'pg'
import { logger } from '../logger'

export let pool: Pool

export async function ConnectDB() {
  pool = new Pool({
    connectionString: process.env.PG_DSN,
    connectionTimeoutMillis: 5000
  })
  logger.debug("connected to pg")
}
