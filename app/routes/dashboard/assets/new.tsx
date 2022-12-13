import * as React from "react"
import * as z from "zod"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
} from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import type {
  FileUploadHandlerFilterArgs,
  NodeOnDiskFile,
} from "@remix-run/node/dist/upload/fileUploadHandler"
import { unstable_parseMultipartFormData as parseMultipartFormData } from "@remix-run/server-runtime"
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useSubmit,
  useTransition,
} from "@remix-run/react"
import invariant from "tiny-invariant"
import sanitizeHtml from "sanitize-html"

import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Grid from "@mui/material/Grid"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import InputLabel from "@mui/material/InputLabel"
import CircularProgress from "@mui/material/CircularProgress"
import FormHelperText from "@mui/material/FormHelperText"

import {
  createS3FileUploadHandler,
  createLocalFileUploadHandler,
} from "~/utils/upload-handler"
import { validateAction, Zod } from "~/utils/validation"
import { useForm } from "~/components/hooks/use-form"
import type { Asset } from "~/models/asset.server"
import { isNameUnique } from "~/models/asset.server"
import { createAsset } from "~/models/asset.server"
import { requireUserId } from "~/session.server"
import { useUserList } from "~/routes/resources/users"
import OutlinedInput from "@mui/material/OutlinedInput"
import { getUserById, isUserId } from "~/models/user.server"
import { isEmptyHtml } from "~/utils/common"
import { PagePaper } from "~/components/layout"

const ReactQuill = React.lazy(() => import("react-quill"))

export const meta: MetaFunction = () => {
  return {
    title: "New Asset - iBuddy",
  }
}

export function loader({ request }: LoaderArgs) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type") ?? ""
  if (!["file", "email_template"].includes(type)) {
    return redirect("?type=file")
  }
  return null
}

const UPLOAD_FIELD_NAME = "file"
const MAX_FILE_SIZE_IN_BYTES = 1024 * 1024 * 10 // 10MB
const ASSET_TYPES: Readonly<Record<Asset["type"], Readonly<string[]>>> = {
  image: ["image/png", "image/jpeg", "image/gif"],
  document: ["application/pdf"],
  "email-template": [],
} as const
const ALLOWED_FILE_TYPES = Object.values(ASSET_TYPES).flat()

function allowOnlyPermittedFiles({
  contentType,
  name,
}: FileUploadHandlerFilterArgs) {
  if (name !== UPLOAD_FIELD_NAME) {
    return false
  }
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    return false
  }
  return true
}

const schema = z
  .object({
    name: Zod.requiredString("Name").refine(isNameUnique, {
      message: "Name is already taken",
    }),
    description: z
      .string()
      .max(2000, "Description cannot be too long")
      .optional(),
    file: z.instanceof(File, {
      message: "File is required",
    }),
    template: Zod.requiredString("Body"),
    sharedUsers: z.string().optional(),
    type: z.enum(["file", "email-template"]),
  })
  .partial({
    file: true,
    template: true,
  })
  .refine(
    data => {
      if (data.type === "file") {
        return data.file
      }
      return true
    },
    {
      message: "File is required",
      path: ["file"],
    },
  )
  .refine(
    data => {
      if (data.type === "email-template") {
        return data.template && !isEmptyHtml(data.template)
      }
      return true
    },
    {
      message: "Template is required",
      path: ["template"],
    },
  )

type ActionInput = z.TypeOf<typeof schema>

export async function action({ request }: ActionArgs) {
  const userId = await requireUserId(request)
  const clonedRequest = request.clone()
  const {
    formData: { name, description, sharedUsers, type, template },
    errors,
  } = await validateAction<ActionInput>({
    request: clonedRequest,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  invariant(
    typeof name === "string" &&
      typeof description === "string" &&
      typeof sharedUsers === "string" &&
      typeof type === "string",
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

  switch (type) {
    case "file": {
      const isProduction = process.env.NODE_ENV === "production"
      const uploadHandler = (
        isProduction ? createS3FileUploadHandler : createLocalFileUploadHandler
      )({
        filter: allowOnlyPermittedFiles,
        maxPartSize: MAX_FILE_SIZE_IN_BYTES,
      })
      const formData = await parseMultipartFormData(request, uploadHandler)
      const file = formData.get("file") as NodeOnDiskFile | File
      if (!file) {
        throw new Response("Failed to upload", { status: 400 })
      }
      const { name: fileKey, type: fileType } = file
      invariant(fileType, "File type is unknown")

      const createdAsset = await createAsset({
        ownerId: userId,
        name,
        description,
        sharedUsers: validSharedUserIds,
        host: isProduction ? "s3" : "local",
        type: mapFileTypeToAssetType(fileType),
        src: fileKey,
      })
      return redirect(`/dashboard/assets/${createdAsset.id}`)
    }
    case "email-template": {
      invariant(
        typeof template === "string",
        "Template is submitted incorrectly",
      )
      const sanitizedTemplate = sanitizeHtml(template)
      const createdAsset = await createAsset({
        ownerId: userId,
        name,
        description,
        sharedUsers: validSharedUserIds,
        host: "local",
        type: "email-template",
        src: sanitizedTemplate,
      })
      return redirect(`/dashboard/assets/${createdAsset.id}`)
    }
    default: {
      throw new Error("Invalid type provided")
    }
  }
}

function mapFileTypeToAssetType(fileType: string): Asset["type"] {
  if (ASSET_TYPES.image.includes(fileType)) {
    return "image"
  }
  if (ASSET_TYPES.document.includes(fileType)) {
    return "document"
  }
  return "email-template"
}

export default function NewAssetPage() {
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get("type")

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          New asset
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <ChooseType />
      </Grid>
      <Grid item xs={12}>
        <PagePaper>
          {typeParam === "file" && <CreateFileAsset />}
          {typeParam === "email_template" && <CreateEmailTemplateAsset />}
        </PagePaper>
      </Grid>
    </Grid>
  )
}

function ChooseType() {
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get("type")

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Link to="?type=file">
          <Card
            sx={{
              minWidth: 275,
              borderStyle: "solid",
              borderWidth: 1,
              borderColor:
                typeParam === "file" ? "primary.light" : "background.paper",
            }}
            raised={typeParam === "file"}
          >
            <CardContent>
              <Typography variant="h5" component="div">
                File
              </Typography>
              <Typography variant="body2">
                Upload a file such as a PDF, png, or a jpg.
              </Typography>
            </CardContent>
          </Card>
        </Link>
      </Grid>
      <Grid item xs={6}>
        <Link to="?type=email_template">
          <Card
            sx={{
              minWidth: 275,
              borderStyle: "solid",
              borderWidth: 1,
              borderColor:
                typeParam === "email_template"
                  ? "primary.light"
                  : "background.paper",
            }}
            raised={typeParam === "email_template"}
          >
            <CardContent>
              <Typography variant="h5" component="div">
                Email template
              </Typography>
              <Typography variant="body2">
                Create a template for an email that can be sent to your mentees.
              </Typography>
            </CardContent>
          </Card>
        </Link>
      </Grid>
    </Grid>
  )
}

function CreateFileAsset() {
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)
  const { list: userList, isLoading: isUserListLoading } = useUserList()

  return (
    <Form method="post" encType="multipart/form-data" noValidate>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            label="Name"
            fullWidth
            required
            {...register("name")}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            label="Description"
            fullWidth
            multiline
            rows={3}
            {...register("description")}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="File"
            type="file"
            placeholder=" "
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              accept: ALLOWED_FILE_TYPES.join(","),
            }}
            required
            fullWidth
            {...register(UPLOAD_FIELD_NAME)}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="demo-multiple-name-label">Shared with</InputLabel>
            <Select
              labelId="demo-multiple-name-label"
              id="demo-multiple-name"
              defaultValue={[]}
              input={<OutlinedInput label="Name" />}
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
      </Grid>
      <Button
        fullWidth
        sx={{ mt: 3 }}
        type="submit"
        variant="contained"
        disabled={isBusy}
        name="type"
        value="file"
      >
        {isBusy ? "Uploading..." : "Upload"}
      </Button>
    </Form>
  )
}

function CreateEmailTemplateAsset() {
  const submit = useSubmit()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)
  const { list: userList, isLoading: isUserListLoading } = useUserList()
  // can't figure out the correct type for dynamically imported ReactQuill
  const editorRef = React.useRef<any>(null)

  const templateError = actionData?.errors?.template
  const sharedUsersError = actionData?.errors?.sharedUsers

  return (
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
            fullWidth
            required
            {...register("name")}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            label="Description"
            fullWidth
            multiline
            rows={3}
            {...register("description")}
          />
        </Grid>
        <Grid item xs={12}>
          <React.Suspense fallback={<CircularProgress />}>
            <FormControl fullWidth error={Boolean(templateError)}>
              <ReactQuill theme="snow" ref={editorRef} />
              <FormHelperText>{templateError}</FormHelperText>
            </FormControl>
          </React.Suspense>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth error={Boolean(sharedUsersError)}>
            <InputLabel id="demo-multiple-name-label">Shared with</InputLabel>
            <Select
              labelId="demo-multiple-name-label"
              id="demo-multiple-name"
              defaultValue={[]}
              input={<OutlinedInput label="Name" />}
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
            <FormHelperText>{sharedUsersError}</FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      <input type="hidden" name="type" value="email-template" />
      <Button
        type="submit"
        disabled={isBusy}
        variant="contained"
        sx={{ mt: 3 }}
        fullWidth
      >
        {isBusy ? "Creating..." : "Create"}
      </Button>
    </Form>
  )
}
