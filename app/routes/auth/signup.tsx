import type { ActionFunction, MetaFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
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
  Grid,
  Container,
  Box,
  Avatar,
} from "@mui/material"
import Icon from "@mdi/react"
import { mdiAccountPlusOutline } from "@mdi/js"

import { createUserSession } from "~/session.server"
import { validateAction, Zod } from "~/utils/validation"
import { createUser } from "~/models/user.server"
import { safeRedirect, useRedirectToValue } from "~/utils/redirect"
import { useForm } from "~/components/hooks/use-form"
import { Copyright } from "~/components/coypright"

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const redirectTo = useRedirectToValue()
  const actionData = useActionData()
  const transition = useTransition()
  const isSubmitting = transition.state === "submitting"

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
          <Icon path={mdiAccountPlusOutline} size={1} />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign up
        </Typography>
        <Form method="post" noValidate>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="First Name"
                autoComplete="given-name"
                autoFocus
                {...register("firstName")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Last Name"
                autoComplete="family-name"
                {...register("lastName")}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email Address"
                autoComplete="email"
                {...register("email")}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign Up {isSubmitting && "..."}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Typography color="primary">
                <Link
                  to={{
                    pathname: "/auth/signin",
                    search: searchParams.toString(),
                  }}
                  style={{ color: "inherit" }}
                >
                  Already have an account? Sign in
                </Link>
              </Typography>
            </Grid>
          </Grid>
        </Form>
      </Box>
      <Copyright sx={{ mt: 5 }} />
    </Container>
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
