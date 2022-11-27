import type { ActionFunction, MetaFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Form, Link, useActionData, useTransition } from "@remix-run/react"
import * as z from "zod"

import {
  TextField,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Container,
  Box,
  Avatar,
} from "@mui/material"
import Icon from "@mdi/react"
import { mdiLockOutline } from "@mdi/js"

import { verifyLogin } from "~/models/user.server"
import { createUserSession } from "~/session.server"
import { validateAction, Zod } from "~/utils/validation"
import { safeRedirect, useRedirectToValue } from "~/utils/redirect"
import { useForm } from "~/components/hooks/use-form"
import { Copyright } from "~/components/coypright"

export default function SignInPage() {
  const redirectTo = useRedirectToValue()
  const actionData = useActionData()
  const transition = useTransition()
  const isBusy = transition.state !== "idle"

  const { register } = useForm(actionData?.errors)

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <Icon path={mdiLockOutline} size={1} />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign in
        </Typography>
        <Form method="post" noValidate>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <TextField
            required
            fullWidth
            variant="outlined"
            margin="normal"
            label="Email Address"
            autoComplete="email"
            {...register("email")}
          />
          <TextField
            required
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            {...register("password")}
          />
          <FormControlLabel
            control={<Checkbox name="remember" color="primary" />}
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isBusy}
          >
            Sign In {isBusy && "..."}
          </Button>
          {/* TODO: Planned feature */}
          {false && (
            <Typography color="primary">
              <Link to="#" style={{ color: "inherit" }}>
                Forgot password?
              </Link>
            </Typography>
          )}
        </Form>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  )
}

const schema = z.object({
  email: Zod.email(),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(1, "Password is required"),
  remember: z.enum(["on"]).optional(),
  redirectTo: z.string().optional(),
})

type ActionInput = z.TypeOf<typeof schema>

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

export const meta: MetaFunction = () => {
  return {
    title: "Sign In",
  }
}
