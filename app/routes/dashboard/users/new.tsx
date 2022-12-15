import * as z from "zod"
import type { ActionFunction, LoaderArgs, MetaFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { json } from "@remix-run/node"

import {
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormHelperText,
} from "@mui/material"
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react"

import { useForm } from "~/components/hooks/use-form"
import { validateAction, Zod } from "~/utils/validation"
import { requireUser } from "~/session.server"
import { createUser, isEmailUnique, Role } from "~/models/user.server"
import { PagePaper } from "~/components/layout"
import { sendWelcomeEmail } from "~/utils/email-service"
import { generateRandomPassword } from "~/utils/common"

export const meta: MetaFunction = () => {
  return {
    title: "New user - iBuddy",
  }
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const roles = [
    {
      role: Role.BUDDY,
      label: "Buddy",
      disabled: false,
    },
    {
      role: Role.HR,
      label: "HR",
      disabled: user.role <= Role.HR,
    },
    {
      role: Role.PRESIDENT,
      label: "President",
      disabled: user.role <= Role.PRESIDENT,
    },
    {
      role: Role.ADMIN,
      label: "Admin",
      disabled: user.role !== Role.ADMIN,
    },
  ]
  return json({ roles })
}

const schema = z
  .object({
    firstName: Zod.name("First name"),
    lastName: Zod.name("Last name"),
    email: Zod.email().refine(isEmailUnique, {
      message: "This email is already taken",
    }),
    faculty: Zod.requiredString("Faculty"),
    agreementStartDate: Zod.dateString("Start date"),
    agreementEndDate: Zod.dateString("End date"),
    role: z.nativeEnum(Role),
  })
  .and(
    z
      .object({
        agreementStartDate: z.string(),
        agreementEndDate: z.string(),
      })
      .refine(
        ({ agreementStartDate, agreementEndDate }) => {
          if (!agreementStartDate || !agreementEndDate) {
            return true
          }
          const startDate = new Date(agreementStartDate)
          const endDate = new Date(agreementEndDate)
          const today = new Date()
          // end date should not be in the past
          // start date can be both in past and future
          // end date should not be before the start date
          return endDate > today && endDate >= startDate
        },
        {
          message: "End date must be in the future and after the start date",
          path: ["agreementEndDate"],
        },
      ),
  )

type ActionInput = z.TypeOf<typeof schema>

export const action: ActionFunction = async ({ request }) => {
  const user = await requireUser(request)
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema: schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  if (user.role !== Role.ADMIN && formData.role >= user.role) {
    return json(
      { errors: { role: "Not allowed to create a user with such access" } },
      { status: 400 },
    )
  }
  const randomPassword = generateRandomPassword()
  const createdUser = await createUser({
    ...formData,
    password: randomPassword,
  })
  await sendWelcomeEmail({
    user: createdUser,
    password: randomPassword,
  })
  return redirect("/dashboard/users")
}

export default function NewUserPage() {
  const { roles } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)

  const roleError = actionData?.errors?.role

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          New user
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <PagePaper>
          <Form method="post" noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  autoFocus
                  label="First Name"
                  {...register("firstName")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  {...register("lastName")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Faculty"
                  {...register("faculty")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Email Address"
                  {...register("email")}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={roleError}>
                  <InputLabel id="user-role">User role</InputLabel>
                  <Select
                    labelId="user-role"
                    label="User role"
                    defaultValue={roles[0].role}
                    readOnly={roles.filter(role => !role.disabled).length <= 1}
                    {...register("role")}
                  >
                    {roles.map(role => (
                      <MenuItem
                        key={role.role}
                        value={role.role}
                        disabled={role.disabled}
                      >
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{roleError}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Start Date"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  {...register("agreementStartDate")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="End Date"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  {...register("agreementEndDate")}
                />
              </Grid>
            </Grid>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isBusy}
            >
              Register {isBusy && "..."}
            </Button>
          </Form>
        </PagePaper>
      </Grid>
    </Grid>
  )
}
