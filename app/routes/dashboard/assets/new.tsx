import * as z from "zod"
import type { ActionArgs, MetaFunction } from "@remix-run/server-runtime"
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
import * as React from "react"
import { CircularProgress } from "@mui/material"

const ReactQuill = React.lazy(() => import("react-quill"))

export const meta: MetaFunction = () => {
  return {
    title: "New Asset - iBuddy",
  }
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
    template: Zod.requiredString(),
    sharedUsers: z.string().optional(),
    type: z.enum(["file", "email-template"]),
  })
  .partial({
    file: true,
    template: true,
  })
  .refine(data => data.file || data.template, "file or template required.")
  .refine(data => {
    if (data.type === "email-template" && data.template) {
      const isEmptyHtml = data.template.replace(/<[^>]+>/g, "").trim() === ""
      return !isEmptyHtml
    }
    return true
  }, "Template is required.")

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

  const renderPage = () => {
    switch (typeParam) {
      case "file":
        return <CreateFileAsset />
      case "email_template":
        return <CreateEmailTemplateAsset />
      default:
        return <ChooseType />
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <h1>New Asset</h1>
      {renderPage()}
    </div>
  )
}

function ChooseType() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Link to="?type=file">
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div">
                File
              </Typography>
              <Typography variant="body2">
                A file such as a PDF, image, or a video.
              </Typography>
            </CardContent>
          </Card>
        </Link>
      </Grid>
      <Grid item xs={6}>
        <Link to="?type=email_template">
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div">
                Email template
              </Typography>
              <Typography variant="body2">
                A template for an email that can be sent to users.
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
      <TextField
        variant="outlined"
        label="Name"
        fullWidth
        required
        {...register("name")}
      />
      <TextField
        variant="outlined"
        label="Description"
        fullWidth
        multiline
        rows={3}
        {...register("description")}
      />
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
        {...register(UPLOAD_FIELD_NAME)}
      />
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
      <input type="hidden" name="type" value="file" />
      <Button type="submit" variant="contained" disabled={isBusy}>
        Create
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

  return (
    <form
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
      <TextField
        variant="outlined"
        label="Name"
        fullWidth
        required
        {...register("name")}
      />
      <TextField
        variant="outlined"
        label="Description"
        fullWidth
        multiline
        rows={3}
        {...register("description")}
      />
      <React.Suspense fallback={<CircularProgress />}>
        <ReactQuill theme="snow" style={{ height: 300 }} ref={editorRef} />
      </React.Suspense>
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
      <input type="hidden" name="type" value="email-template" />
      <Button type="submit" disabled={isBusy} variant="contained">
        {isBusy ? "Creating..." : "Create"}
      </Button>
    </form>
  )
}
