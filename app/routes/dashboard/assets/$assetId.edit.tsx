import * as z from "zod"
import Button from "@mui/material/Button"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import OutlinedInput from "@mui/material/OutlinedInput"
import Select from "@mui/material/Select"
import TextField from "@mui/material/TextField"
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
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

const schema = z.object({
  name: Zod.requiredString("Name"),
  description: z
    .string()
    .max(2000, "Description cannot be too long")
    .optional(),
  sharedUsers: z.string().optional(),
})

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
    formData: { name, description, sharedUsers },
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
      typeof sharedUsers === "string",
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

  await updateAsset({
    id: assetId,
    name,
    description,
    sharedUsers: validSharedUserIds,
  })

  return redirect(`/dashboard/assets/${assetId}`)
}

export default function AssetPage() {
  const { asset } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)
  const { list: userList, isLoading: isUserListLoading } = useUserList()

  return (
    <Form method="post" encType="multipart/form-data" noValidate>
      <TextField
        variant="outlined"
        label="Name"
        defaultValue={asset.name}
        fullWidth
        required
        {...register("name")}
      />
      <TextField
        variant="outlined"
        label="Description"
        defaultValue={asset.description}
        fullWidth
        multiline
        rows={3}
        {...register("description")}
      />
      <FormControl fullWidth>
        <InputLabel id="demo-multiple-name-label">Shared with</InputLabel>
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
      <Button type="submit" variant="contained" disabled={isBusy}>
        {isBusy ? "Saving..." : "Save"}
      </Button>
    </Form>
  )
}
