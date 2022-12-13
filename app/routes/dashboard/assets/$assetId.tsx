import * as React from "react"
import {
  Form,
  Link as RemixLink,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import CardMedia from "@mui/material/CardMedia"
import Link from "@mui/material/Link"
import Icon from "@mdi/react"
import {
  mdiEmailSealOutline,
  mdiFileDocumentOutline,
  mdiImageOutline,
} from "@mdi/js"

import { PagePaper } from "~/components/layout"
import type { Asset } from "~/models/asset.server"
import { canUserMutateAsset } from "~/models/asset.server"
import { deleteAsset, canUserViewAsset } from "~/models/asset.server"
import { getAssetById } from "~/models/asset.server"
import { requireUser } from "~/session.server"
import { getSignedUrl } from "~/utils/s3"
import { getUserById } from "~/models/user.server"
import { PendingMuiLink } from "~/components/link"
import { pick } from "~/utils/object"

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

  const [owner, sharedUsers] = await Promise.all([
    getUserById(asset.ownerId),
    Promise.all(
      asset.sharedUsers.map(async userId => {
        const user = await getUserById(userId)
        invariant(user, "User not found")
        return user
      }),
    ),
  ])
  invariant(owner, "Owner user not found")

  const src =
    asset.type === "image" ? await resolveImageAssetUrl(asset) : asset.src

  const assetWithCompleteInfo = {
    ...asset,
    src,
    owner,
    sharedUsers: sharedUsers.map(user =>
      pick(user, "email", "firstName", "lastName"),
    ),
  }

  return json({
    asset: pick(
      assetWithCompleteInfo,
      "id",
      "name",
      "description",
      "sharedUsers",
      "type",
      "createdAt",
      "updatedAt",
      "src",
      "owner",
    ),
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
      case "image":
        return (
          <>
            <CardMedia
              image={asset.src}
              alt={asset.name}
              component="img"
              sx={{
                borderRadius: 5,
              }}
            />
            <Stack direction="row" spacing={6} sx={{ mt: 2 }}>
              <Button
                component={Link}
                href={asset.src}
                target="_blank"
                rel="noreferrer"
              >
                View Full Size
              </Button>
              <Button
                component={Link}
                href={asset.src}
                target="_blank"
                rel="noreferrer"
                download
              >
                Download
              </Button>
            </Stack>
          </>
        )
      case "document":
        return (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" sx={{ color: "#505050" }}>
              Preview unavailable
            </Typography>
            <Button
              component={Link}
              href={`/dashboard/assets/${asset.id}/download`}
              target="_blank"
              rel="noreferrer"
              download
            >
              Download
            </Button>
          </Box>
        )
      case "email-template":
        return <div dangerouslySetInnerHTML={{ __html: asset.src }} />
      default:
        return (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" sx={{ color: "#505050" }}>
              Unknown asset type
            </Typography>
          </Box>
        )
    }
  }

  const transition = useTransition()
  const isDeleting =
    transition.state !== "idle" && Boolean(transition.submission)

  return (
    <Grid container spacing={2}>
      <Grid
        item
        xs={12}
        container
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid item xs={9}>
          <Typography
            component="h1"
            variant="h4"
            sx={{ color: "#505050", fontWeight: 600 }}
          >
            {asset.name}
          </Typography>
        </Grid>
        {canUserMutateAsset ? (
          <Grid item xs={3} container justifyContent="flex-end">
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                component={RemixLink}
                to={`/dashboard/assets/${asset.id}/edit`}
              >
                Edit
              </Button>
              <Form method="post">
                <Button
                  variant="outlined"
                  size="small"
                  disabled={isDeleting}
                  type="submit"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </Form>
            </Stack>
          </Grid>
        ) : null}
      </Grid>
      <Grid item xs={12} container spacing={2}>
        <Grid item xs={12} lg={6}>
          <PagePaper>
            {Object.entries({
              Type: (
                <>
                  {asset.type === "image" && (
                    <Icon title="Image" path={mdiImageOutline} size={1} />
                  )}
                  {asset.type === "document" && (
                    <Icon
                      title="Document"
                      path={mdiFileDocumentOutline}
                      size={1}
                    />
                  )}
                  {asset.type === "email-template" && (
                    <Icon
                      title="Email template"
                      path={mdiEmailSealOutline}
                      size={1}
                    />
                  )}
                </>
              ),
              ...(asset.description ? { Description: asset.description } : {}),
              Owner: (
                <PendingMuiLink to={`/dashboard/users/${asset.owner.email}`}>
                  {asset.owner.firstName} {asset.owner.lastName}
                </PendingMuiLink>
              ),
              ...(asset.sharedUsers.length > 0
                ? {
                    "Shared With": (
                      <Typography>
                        {asset.sharedUsers.map((user, idx) => {
                          const isLast = idx === asset.sharedUsers.length - 1
                          const oneBeforeLast =
                            idx === asset.sharedUsers.length - 2
                          return (
                            <React.Fragment key={user.email}>
                              <PendingMuiLink
                                to={`/dashboard/users/${user.email}`}
                              >
                                {user.firstName} {user.lastName}
                              </PendingMuiLink>
                              {isLast ? null : oneBeforeLast ? ", and " : ", "}
                            </React.Fragment>
                          )
                        })}
                      </Typography>
                    ),
                  }
                : {}),
              "Create Date": new Date(asset.createdAt).toLocaleDateString(),
              ...(asset.updatedAt
                ? {
                    "Update Date": new Date(
                      asset.updatedAt,
                    ).toLocaleDateString(),
                  }
                : {}),
            }).map(([key, value]) => (
              <Typography
                key={key}
                variant="body1"
                sx={{ mt: 1, display: "flex" }}
              >
                <Box fontWeight="fontWeightMedium" display="inline">
                  {key}
                </Box>
                {": \u00A0"}
                {value}
              </Typography>
            ))}
          </PagePaper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <PagePaper>{displayAsset()}</PagePaper>
        </Grid>
      </Grid>
    </Grid>
  )
}
