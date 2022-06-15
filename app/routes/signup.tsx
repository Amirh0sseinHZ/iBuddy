import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useTransition,
} from "@remix-run/react"
import * as z from "zod"

import { TextField, Typography, Button, Stack, Grid } from "@mui/material"

import { createUserSession, getUserId } from "~/session.server"
import { validateAction, Zod } from "~/utils/validation"
import { createUser } from "~/models/user.server"
import { safeRedirect } from "~/utils/redirect"
import { useForm } from "~/components/hooks/use-form"

type FormField = { label: string; name: string; type?: string }

const formFields: FormField[] = [
  {
    label: "First name",
    name: "firstName",
  },
  {
    label: "Last name",
    name: "lastName",
  },
  {
    label: "Email",
    name: "email",
  },
  {
    label: "Password",
    name: "password",
    type: "password",
  },
]

export default function SignUp() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/"
  const actionData = useActionData()
  const transition = useTransition()
  const isSubmitting = transition.state === "submitting"

  const { register } = useForm(actionData?.errors)

  return (
    <Grid
      display="flex"
      justifyContent="center"
      flexDirection="column"
      alignItems="center"
      minHeight="100vh"
      padding={2}
    >
      <Typography variant="h1" fontSize={24} gutterBottom>
        Create your account
      </Typography>
      <Typography variant="body1" fontSize={16} classes={{ root: "mb-8" }}>
        to continue to iBuddy
      </Typography>
      <Form method="post" className="w-full text-center" noValidate>
        <Stack spacing={1.5}>
          {formFields.map((field: FormField) => {
            const { name, ...props } = field
            return (
              <TextField
                key={name}
                required
                fullWidth
                variant="outlined"
                {...props}
                {...register(name)}
              />
            )
          })}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="primary" align="center">
              <Link
                to={{
                  pathname: "/signin",
                  search: searchParams.toString(),
                }}
                style={{ color: "inherit" }}
              >
                Sign in instead
              </Link>
            </Typography>
            <Button variant="contained" type="submit" disabled={isSubmitting}>
              Sign up {isSubmitting && "..."}
            </Button>
          </Stack>
        </Stack>
        <input type="hidden" name="redirectTo" value={redirectTo} />
      </Form>
    </Grid>
  )
}

export const meta: MetaFunction = () => {
  return {
    title: "Sign Up",
  }
}

const schema = z.object({
  firstName: Zod.name("First name"),
  lastName: Zod.name("Last name"),
  email: Zod.email(),
  password: Zod.strongPassword(),
  redirectTo: z.string().optional(),
})

type ActionInput = z.TypeOf<typeof schema>

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request)
  if (userId) return redirect("/")
  return json({})
}

export const action: ActionFunction = async ({ request }) => {
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  const {
    firstName,
    lastName,
    email,
    password,
    redirectTo: unsafeRedirectTo,
  } = formData
  const redirectTo = safeRedirect(unsafeRedirectTo)

  const user = await createUser({
    firstName,
    lastName,
    email,
    password,
  })

  return createUserSession({
    request,
    userId: user.id,
    remember: false,
    redirectTo,
  })
}
