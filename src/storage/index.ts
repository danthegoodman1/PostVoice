import S3 from 'aws-sdk/clients/s3'
import fs from 'fs'
import { logger, logMsgKey } from '../logger'
import util from 'util'
import stream from 'stream'

const pipeline = util.promisify(stream.pipeline)

const s3 = new S3({
  endpoint: process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT : undefined
})

export async function UploadS3File(fileName: string, readStream: fs.ReadStream) {
  await s3.upload({
    Bucket: process.env.S3_BUCKET!,
    Key: fileName,
    Body: readStream
  }).promise()
  logger.debug({
    [logMsgKey]: "uploaded s3 file",
    fileName
  })
}

export async function DownloadS3File(fileName: string, writeStream: fs.WriteStream) {
  const readStream = s3.getObject({
    Bucket: process.env.S3_BUCKET!,
    Key: fileName,
  }).createReadStream()
  await pipeline(readStream, writeStream)
  logger.debug({
    [logMsgKey]: "downloaded s3 file",
    fileName
  })
}
