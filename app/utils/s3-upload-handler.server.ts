import invariant from "tiny-invariant"
import type { UploadHandler } from "@remix-run/node"
import type { PutObjectCommandInput } from "@aws-sdk/client-s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner"
import type { FileUploadHandlerOptions } from "@remix-run/node/dist/upload/fileUploadHandler"

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

// Example of getting URL for a file that was uploaded to S3
// ;(async () => {
//   let url = await getSignedUrl(
//     s3Client,
//     new GetObjectCommand({
//       Bucket: process.env.AWS_USERUPLOADS_BUCKET_NAME,
//       Key: "New Project.png",
//     }),
//     { expiresIn: 15 * 60 },
//   )
//   console.log("🚀 ~ ; ~ url", url)
//   let url = await getSignedUrl(
//     s3Client,
//     new GetObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: key,
//     }),
//     { expiresIn: 15 * 60 },
//   )
// })()

async function uploadStreamToS3({
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

async function convertToBuffer(
  array: AsyncIterable<Uint8Array>,
  maxPartSize: number,
) {
  let size = 0
  const result = []
  for await (const chunk of array) {
    size += chunk.byteLength
    if (size > maxPartSize) {
      throw new Error("File max size exceeded")
    }
    result.push(chunk)
  }
  return Buffer.concat(result)
}

type S3UploadHandlerOptions = Pick<
  FileUploadHandlerOptions,
  "filter" | "maxPartSize"
>

export function createS3FileUploadHandler({
  filter,
  maxPartSize = 3000000,
}: S3UploadHandlerOptions = {}): UploadHandler {
  return async ({ name, filename, contentType, data }) => {
    if (
      !filename ||
      (filter && !(await filter({ name, filename, contentType })))
    ) {
      return undefined
    }

    const fileExtension = filename.split(".").pop()
    const key = `${Date.now()}-${filename}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`

    const buffer = await convertToBuffer(data, maxPartSize)

    await uploadStreamToS3({
      body: buffer,
      key,
      contentType,
    })

    return new File([buffer], key, {
      type: contentType,
    })
  }
}
