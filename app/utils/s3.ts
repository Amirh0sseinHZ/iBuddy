import invariant from "tiny-invariant"
import type { PutObjectCommandInput } from "@aws-sdk/client-s3"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner"

const S3_BUCKET_NAME = process.env.ARC_STORAGE_PRIVATE_USERUPLOADS
const AWS_REGION = process.env.AWS_REGION

let s3Client: S3Client | undefined = undefined

if (process.env.NODE_ENV === "production") {
  invariant(S3_BUCKET_NAME, "ARC_STORAGE_PRIVATE_USERUPLOADS is required")
  invariant(AWS_REGION, "AWS_REGION is required")
  s3Client = new S3Client({ region: AWS_REGION })
}

export async function getSignedUrl(
  key: string,
  expiresInSeconds: number = 60 * 10,
) {
  invariant(s3Client, "s3Client is not initialized")
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
  invariant(s3Client, "s3Client is not initialized")
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
  invariant(s3Client, "s3Client is not initialized")
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
  invariant(s3Client, "s3Client is not initialized")
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  })
  await s3Client.send(command)
}
