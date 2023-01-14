import pino from 'pino'

export const logMsgKey = "msg"

export const logger = pino(process.env.DEBUG === "1" ? {
  transport: {
    target: 'pino-pretty',
  },
  level: 'debug'
} : undefined)
