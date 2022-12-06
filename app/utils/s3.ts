import invariant from "tiny-invariant"
import type { PutObjectCommandInput } from "@aws-sdk/client-s3"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner"

const S3_BUCKET_NAME = process.env.AWS_USERUPLOADS_BUCKET_NAME
const AWS_REGION = process.env.AWS_REGION

invariant(S3_BUCKET_NAME, "AWS_USERUPLOADS_BUCKET_NAME is required")
invariant(AWS_REGION, "AWS_REGION is required")

const s3Client = new S3Client({ region: AWS_REGION })

export async function getSignedUrl(
  key: string,
  expiresInSeconds: number = 60 * 10,
) {
  return getS3SignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  )
}

export async function getObjectPromise(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  })
  return s3Client.send(command)
}

export async function uploadStreamToS3({
  body,
  key,
  contentType,
}: {
  body: PutObjectCommandInput["Body"]
  key: string
  contentType: string
}) {
  const putCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await s3Client.send(putCommand)
  return key
}

export async function destroyS3File(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  })
  await s3Client.send(command)
}
