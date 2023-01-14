import S3 from 'aws-sdk/clients/s3'
import fs from 'fs'

const s3 = new S3({
  endpoint: process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT : undefined
})

export async function UploadS3File(fileName: string, readStream: fs.ReadStream) {
  return s3.upload({
    Bucket: process.env.S3_BUCKET!,
    Key: fileName,
    Body: readStream
  }).promise()
}
