import arc from "@architect/functions"
import cuid from "cuid"
import invariant from "tiny-invariant"
import { destroyS3File } from "~/utils/s3"
import { deleteLocalFileSafely } from "~/utils/upload-handler"
import type { User } from "./user.server"
import { Role } from "./user.server"

export type Asset = {
  id: ReturnType<typeof cuid>
  ownerId: User["id"]
  name: string
  description?: string
  type: "image" | "document" | "email-template"
  host: "s3" | "local"
  src: string
  sharedUsers: Array<User["id"]>
  createdAt: string
  updatedAt?: string
}

export async function getUserAssets(ownerId: User["id"]): Promise<Asset[]> {
  const db = await arc.tables()
  const result = await db.assets.query({
    IndexName: "assetsByOwnerId",
    KeyConditionExpression: "ownerId = :ownerId",
    ExpressionAttributeValues: { ":ownerId": ownerId },
  })
  return result.Items
}

export async function getUserAccessibleAssets(
  ownerId: User["id"],
): Promise<Asset[]> {
  const db = await arc.tables()
  const result = await db.assets.scan({
    FilterExpression: "ownerId = :ownerId or contains(sharedUsers, :ownerId)",
    ExpressionAttributeValues: { ":ownerId": ownerId },
  })
  return result.Items
}

export async function getAllAssets(): Promise<Asset[]> {
  const db = await arc.tables()
  const result = await db.assets.scan({})
  return result.Items
}

export async function getAssetById(id: Asset["id"]): Promise<Asset | null> {
  const db = await arc.tables()
  const result = await db.assets.query({
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": id },
  })
  const record: Asset | null = result.Items[0]
  return record
}

export async function createAsset(
  newAsset: Omit<Asset, "id" | "createdAt" | "updatedAt">,
): Promise<Asset> {
  const id = cuid()
  const db = await arc.tables()
  await db.assets.put({
    ...newAsset,
    id,
    createdAt: new Date().toISOString(),
  })
  const asset = await getAssetById(id)
  invariant(asset, "Asset not found after creation, this should not happen")
  return asset
}

export async function deleteAsset(id: Asset["id"]): Promise<void> {
  const db = await arc.tables()
  const asset = await getAssetById(id)
  if (!asset) {
    return
  }
  await db.assets.delete({ id })
  if (asset.host === "s3") {
    await destroyS3File(asset.src)
  } else if (asset.host === "local") {
    deleteLocalFileSafely(asset.src)
  } else {
    throw new Error("Unknown asset host")
  }
}

export function canViewAsset({
  asset,
  user,
}: {
  asset: Asset
  user: User
}): boolean {
  return (
    user.role === Role.ADMIN ||
    user.id === asset.ownerId ||
    asset.sharedUsers.includes(user.id)
  )
}

export function canDeleteAsset({
  asset,
  user,
}: {
  asset: Asset
  user: User
}): boolean {
  return user.role === Role.ADMIN || user.id === asset.ownerId
}
