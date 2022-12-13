import * as React from "react"
import * as z from "zod"
import {
  Form,
  useActionData,
  useLoaderData,
  useSubmit,
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
import sanitizeHtml from "sanitize-html"

import Button from "@mui/material/Button"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import OutlinedInput from "@mui/material/OutlinedInput"
import Select from "@mui/material/Select"
import TextField from "@mui/material/TextField"
import CircularProgress from "@mui/material/CircularProgress"
import Grid from "@mui/material/Grid"

import { useForm } from "~/components/hooks/use-form"
import {
  canUserMutateAsset,
  getAssetById,
  updateAsset,
} from "~/models/asset.server"
import { useUserList } from "~/routes/resources/users"
import { requireUser } from "~/session.server"
import { validateAction, Zod } from "~/utils/validation"
import { getUserById, isUserId } from "~/models/user.server"
import { isEmptyHtml } from "~/utils/common"
import { PagePaper } from "~/components/layout"
import Typography from "@mui/material/Typography"

const ReactQuill = React.lazy(() => import("react-quill"))

export const meta: MetaFunction = ({ data }) => {
  const { asset } = data as SerializeFrom<typeof loader>
  return {
    title: `Edit ${asset.name} - iBuddy`,
  }
}

export async function loader({ params, request }: LoaderArgs) {
  const user = await requireUser(request)
  const { assetId } = params
  invariant(assetId, "Asset ID is required")
  const asset = await getAssetById(assetId)
  invariant(asset, "Asset not found")
  invariant(
    canUserMutateAsset({ user, asset }),
    "You are not allowed to edit this asset",
  )

  return json({ asset })
}

const schema = z
  .object({
    name: Zod.requiredString("Name"),
    description: z
      .string()
      .max(2000, "Description cannot be too long")
      .optional(),
    sharedUsers: z.string().optional(),
    template: Zod.requiredString("Template"),
    type: z.enum(["file", "email-template"]),
  })
  .partial({
    template: true,
  })
  .refine(data => {
    if (data.type !== "email-template") {
      return true
    }
    if (!data.template) {
      return false
    }
    return !isEmptyHtml(data.template)
  }, "Template is required")

type ActionInput = z.TypeOf<typeof schema>

export async function action({ params, request }: ActionArgs) {
  const user = await requireUser(request)
  const { assetId } = params
  invariant(assetId, "Asset ID is required")
  const asset = await getAssetById(assetId)
  invariant(asset, "Asset not found")
  invariant(
    canUserMutateAsset({ user, asset }),
    "You are not allowed to edit this asset",
  )
  const {
    formData: { name, description, sharedUsers, type, template },
    errors,
  } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  invariant(
    typeof name === "string" &&
      typeof description === "string" &&
      typeof sharedUsers === "string" &&
      typeof type === "string" &&
      typeof template === "string",
    "Form submitted incorrectly",
  )
  const sharedUserIds = sharedUsers.split(",").filter(Boolean)
  invariant(
    sharedUserIds.every(isUserId),
    "Invalid user id submitted for sharing",
  )
  const sharedUserList = await Promise.all(sharedUserIds.map(getUserById))
  const validSharedUserIds = sharedUserList.map(user => {
    if (user) {
      return user.id
    }
    throw new Error("Invalid user id submitted for sharing")
  })

  const sanitizedTemplate = sanitizeHtml(template)
  await updateAsset({
    id: assetId,
    src: sanitizedTemplate,
    name,
    description,
    sharedUsers: validSharedUserIds,
  })

  return redirect(`/dashboard/assets/${assetId}`)
}

export default function AssetEditPage() {
  const submit = useSubmit()
  const { asset } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)
  const { list: userList, isLoading: isUserListLoading } = useUserList()
  // can't figure out the correct type for dynamically imported ReactQuill
  const editorRef = React.useRef<any>(null)

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          Edit asset
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <PagePaper>
          <Form
            method="post"
            noValidate
            onSubmit={e => {
              e.preventDefault()
              const template = editorRef.current?.unprivilegedEditor.getHTML()
              const formData = new FormData(e.currentTarget)
              formData.append("template", template)
              submit(formData, { method: "post" })
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  label="Name"
                  defaultValue={asset.name}
                  fullWidth
                  required
                  {...register("name")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  label="Description"
                  defaultValue={asset.description}
                  fullWidth
                  multiline
                  rows={3}
                  {...register("description")}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="demo-multiple-name-label">
                    Shared with
                  </InputLabel>
                  <Select
                    labelId="demo-multiple-name-label"
                    id="demo-multiple-name"
                    input={<OutlinedInput label="Name" />}
                    defaultValue={asset.sharedUsers}
                    disabled={isUserListLoading}
                    multiple
                    {...register("sharedUsers")}
                  >
                    {userList.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                {asset.type === "email-template" ? (
                  <React.Suspense fallback={<CircularProgress />}>
                    <ReactQuill
                      theme="snow"
                      ref={editorRef}
                      defaultValue={asset.src}
                    />
                  </React.Suspense>
                ) : null}
              </Grid>
            </Grid>
            <input
              type="hidden"
              name="type"
              value={
                asset.type === "email-template" ? "email-template" : "file"
              }
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isBusy}
              fullWidth
            >
              {isBusy ? "Saving..." : "Save"}
            </Button>
          </Form>
        </PagePaper>
      </Grid>
    </Grid>
  )
}
