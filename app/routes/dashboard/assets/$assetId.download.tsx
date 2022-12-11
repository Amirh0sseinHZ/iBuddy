import type { LoaderArgs } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import { canUserViewAsset, getAssetById } from "~/models/asset.server"
import { requireUser } from "~/session.server"
import { getObjectPromise } from "~/utils/s3"

export async function loader({ params, request }: LoaderArgs) {
  const user = await requireUser(request)
  const { assetId } = params
  invariant(assetId, "Asset ID is required")

  const asset = await getAssetById(assetId)
  invariant(asset, "Asset not found")
  invariant(
    canUserViewAsset({ user, asset }),
    "You are not allowed to view this asset",
  )

  let pdfBlob: Blob
  switch (asset.host) {
    case "s3": {
      const promise = await getObjectPromise(asset.src)
      const { Body } = promise
      const byteArray = await Body?.transformToByteArray()
      invariant(byteArray, "Something went wrong")

      pdfBlob = new Blob([byteArray])
      break
    }
    case "local": {
      const response = await fetch(
        // TODO: don't use hardcoded url
        `http://localhost:3000/_static/uploads/${asset.src}`,
      )
      pdfBlob = await response.blob()
      break
    }
    default: {
      throw new Error(`Unknown asset host: ${asset.host}`)
    }
  }

  return new Response(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${asset.name}.pdf`,
    },
  })
}
