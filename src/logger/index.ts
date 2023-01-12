import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.DEBUG === '1' ? 'debug' : 'info',
  format: winston.format.json(),
  // defaultMeta: { service: 'user-service' },
})

if (process.env.ENV === "prod") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.json(),
    })
  )
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  )
}
