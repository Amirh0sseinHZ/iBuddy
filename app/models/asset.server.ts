import arc from "@architect/functions"
import type { ArcTable } from "@architect/functions/tables"
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
  searchableName: string
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
  ownerId: Asset["ownerId"],
  { type }: { type?: Asset["type"] } = {},
): Promise<Asset[]> {
  type ScanParams = Parameters<ArcTable["scan"]>[0]
  const params: ScanParams = {
    FilterExpression: "ownerId = :ownerId or contains(sharedUsers, :ownerId)",
    ExpressionAttributeValues: { ":ownerId": ownerId },
  }
  if (type) {
    params.FilterExpression += " and #type = :type"
    params.ExpressionAttributeNames = { "#type": "type" }
    params.ExpressionAttributeValues[":type"] = type
  }
  const db = await arc.tables()
  const result = await db.assets.scan(params)
  return result.Items
}

export async function getAllAssets(): Promise<Asset[]> {
  const db = await arc.tables()
  const result = await db.assets.scan({})
  return result.Items
}

export async function getAllEmailTemplates(): Promise<Asset[]> {
  const db = await arc.tables()
  const result = await db.assets.scan({
    FilterExpression: "#type = :type",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: { ":type": "email-template" },
  })
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

export async function isNameUnique(name: Asset["name"]): Promise<boolean> {
  const db = await arc.tables()
  const result = await db.assets.query({
    IndexName: "assetBySearchableName",
    KeyConditionExpression: "searchableName = :name",
    ExpressionAttributeValues: { ":name": name.toLowerCase() },
  })
  return result.Count === 0
}

export async function createAsset(
  newAsset: Omit<Asset, "id" | "searchableName" | "createdAt" | "updatedAt">,
): Promise<Asset> {
  const id = cuid()
  const db = await arc.tables()
  await db.assets.put({
    ...newAsset,
    id,
    name: newAsset.name.trim(),
    searchableName: newAsset.name.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  })
  const asset = await getAssetById(id)
  invariant(asset, "Asset not found after creation, this should not happen")
  return asset
}

export async function updateAsset({
  id,
  name,
  description,
  sharedUsers,
  src,
}: Pick<
  Asset,
  "id" | "name" | "description" | "src" | "sharedUsers"
>): Promise<Asset> {
  const asset = await getAssetById(id)
  invariant(asset, "Asset not found")
  const updatedExpression = `set #name = :name, searchableName = :searchableName, description = :description, sharedUsers = :sharedUsers, updatedAt = :updatedAt${
    asset.type === "email-template" ? ", src = :src" : ""
  }`
  const db = await arc.tables()
  const result = await db.assets.update({
    Key: { id },
    UpdateExpression: updatedExpression,
    ExpressionAttributeNames: { "#name": "name" },
    ExpressionAttributeValues: {
      ":name": name.trim(),
      ":searchableName": name.toLowerCase().trim(),
      ":description": description,
      ":sharedUsers": sharedUsers,
      ":updatedAt": new Date().toISOString(),
      ...(asset.type === "email-template" ? { ":src": src } : {}),
    },
    ReturnValues: "ALL_NEW",
  })
  return result.Attributes as Asset
}

export async function deleteAsset(id: Asset["id"]): Promise<void> {
  const db = await arc.tables()
  const asset = await getAssetById(id)
  if (!asset) {
    return
  }
  await db.assets.delete({ id })
  if (asset.type === "email-template") {
    return
  }
  if (asset.host === "s3") {
    await destroyS3File(asset.src)
  } else if (asset.host === "local") {
    deleteLocalFileSafely(asset.src)
  } else {
    throw new Error("Unknown asset host")
  }
}

export function canUserViewAsset({
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

export function canUserMutateAsset({
  asset,
  user,
}: {
  asset: Asset
  user: User
}): boolean {
  return user.role === Role.ADMIN || user.id === asset.ownerId
}
