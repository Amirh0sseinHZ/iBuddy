import { useLoaderData } from "@remix-run/react"
import type { LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import type { Asset } from "~/models/asset.server"
import { canViewAsset } from "~/models/asset.server"
import { getAssetById } from "~/models/asset.server"
import { requireUser } from "~/session.server"
import { getSignedUrl } from "~/utils/s3-upload-handler.server"

async function resolveImageAssetUrl(asset: Asset) {
  switch (asset.host) {
    case "local":
      return `/_static/uploads/${asset.src}`
    case "s3":
      return await getSignedUrl(asset.src)
    default:
      throw new Error(`Unknown asset host: ${asset.host}`)
  }
}

export async function loader({ params, request }: LoaderArgs) {
  const user = await requireUser(request)
  const { assetId } = params
  invariant(assetId, "Asset ID is required")
  const asset = await getAssetById(assetId)
  invariant(asset, "Asset not found")
  invariant(
    canViewAsset({ user, asset }),
    "You are not allowed to view this asset",
  )

  return json({
    asset: {
      ...asset,
      src:
        asset.type === "image" || asset.type === "document"
          ? await resolveImageAssetUrl(asset)
          : asset.src,
    },
  })
}
export default function AssetPage() {
  const { asset } = useLoaderData<typeof loader>()

  const displayAsset = () => {
    switch (asset.type) {
      case "image": {
        return <img src={asset.src} alt={asset.name} />
      }
      case "document":
        return (
          <a
            target="_blank"
            href={`/dashboard/assets/${asset.id}/download`}
            download
            rel="noreferrer"
          >
            Download
          </a>
        )
      default: {
        break
      }
    }
  }

  return (
    <div>
      <pre>{JSON.stringify(asset, null, 2)}</pre>
      {displayAsset()}
    </div>
  )
}
