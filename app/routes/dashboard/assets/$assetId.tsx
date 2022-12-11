import Button from "@mui/material/Button"
import { Form, Link, useLoaderData } from "@remix-run/react"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import type { Asset } from "~/models/asset.server"
import { canUserMutateAsset } from "~/models/asset.server"
import { deleteAsset, canUserViewAsset } from "~/models/asset.server"
import { getAssetById } from "~/models/asset.server"
import { requireUser } from "~/session.server"
import { getSignedUrl } from "~/utils/s3"

export const meta: MetaFunction = ({ data }) => {
  const { asset } = data as SerializeFrom<typeof loader>
  return {
    title: `${asset.name} - iBuddy`,
  }
}

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
    canUserViewAsset({ user, asset }),
    "You are not allowed to view this asset",
  )

  return json({
    asset: {
      ...asset,
      src:
        asset.type === "image" ? await resolveImageAssetUrl(asset) : asset.src,
    },
    canUserMutateAsset: canUserMutateAsset({ user, asset }),
  })
}

export async function action({ params, request }: ActionArgs) {
  const user = await requireUser(request)
  const { assetId } = params
  invariant(assetId, "Asset ID is required")
  const asset = await getAssetById(assetId)
  invariant(asset, "Asset not found")
  invariant(
    canUserMutateAsset({ user, asset }),
    "You are not allowed to delete this asset",
  )
  await deleteAsset(assetId)
  return redirect("/dashboard/assets")
}

export default function AssetPage() {
  const { asset, canUserMutateAsset } = useLoaderData<typeof loader>()

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
      {canUserMutateAsset ? (
        <>
          <Form method="delete">
            <Button type="submit">Delete</Button>
          </Form>
          <Link to={`/dashboard/assets/${asset.id}/edit`}>Edit</Link>
        </>
      ) : null}
      <pre>{JSON.stringify(asset, null, 2)}</pre>
      {displayAsset()}
    </div>
  )
}
