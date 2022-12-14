import fs from "fs"
import type { FileUploadHandlerOptions } from "@remix-run/node/dist/upload/fileUploadHandler"
import { unstable_createFileUploadHandler } from "@remix-run/node"
import type { UploadHandler } from "@remix-run/node"
import { uploadStreamToS3 } from "./s3"

export const LOCAL_UPLOAD_PATH = "../public/uploads"
export function createLocalFileUploadHandler(args: FileUploadHandlerOptions) {
  return unstable_createFileUploadHandler({
    directory: LOCAL_UPLOAD_PATH,
    ...args,
  })
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

export function deleteLocalFileSafely(fileName: string): void {
  const filePath = `${LOCAL_UPLOAD_PATH}/${fileName}`
  try {
    fs.unlinkSync(filePath)
  } catch (err) {
    console.log(err)
  }
}
