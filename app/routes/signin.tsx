import type { ActionFunction, LoaderFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useTransition,
} from "@remix-run/react"
import * as z from "zod"

import {
  TextField,
  Typography,
  Button,
  Stack,
  Grid,
  Checkbox,
  FormControlLabel,
} from "@mui/material"

import { createUserSession, getUserId } from "~/session.server"
import { validateAction } from "~/utils/validation"
import { verifyLogin } from "~/models/user.server"
import { safeRedirect } from "~/utils/redirect"

export default function Login() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/"
  const actionData = useActionData()
  const transition = useTransition()
  const emailError = actionData?.errors?.email
  const passwordError = actionData?.errors?.password
  const isSubmitting = transition.state === "submitting"

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
        Sign in
      </Typography>
      <Typography variant="body1" fontSize={16} classes={{ root: "mb-8" }}>
        to continue to iBuddy
      </Typography>
      <Form method="post" className="w-full text-center" noValidate>
        <Stack spacing={1.5}>
          <TextField
            required
            fullWidth
            variant="outlined"
            label="Email"
            name="email"
            error={!!emailError}
            helperText={emailError}
          />
          <TextField
            required
            fullWidth
            variant="outlined"
            label="Password"
            type="password"
            name="password"
            error={!!passwordError}
            helperText={passwordError}
          />
          <FormControlLabel
            control={<Checkbox name="remember" />}
            label="Remember me"
            labelPlacement="end"
          />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="primary" align="center">
              <Link
                to={{
                  pathname: "/signup",
                  search: searchParams.toString(),
                }}
                style={{ color: "inherit" }}
              >
                Create account
              </Link>
            </Typography>
            <Button variant="contained" type="submit" disabled={isSubmitting}>
              Sign in {isSubmitting && "..."}
            </Button>
          </Stack>
        </Stack>
        <input type="hidden" name="redirectTo" value={redirectTo} />
      </Form>
    </Grid>
  )
}

const schema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .min(1, "Email is required"),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(1, "Password is required"),
  remember: z.enum(["on"]).optional(),
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
  const { email, password, remember, redirectTo: unsafeRedirectTo } = formData
  const redirectTo = safeRedirect(unsafeRedirectTo)

  const user = await verifyLogin(email, password)

  if (!user) {
    return json(
      { errors: { email: "Invalid email or password" } },
      { status: 400 },
    )
  }
  return createUserSession({
    request,
    userId: user.id,
    remember: remember === "on",
    redirectTo,
  })
}
