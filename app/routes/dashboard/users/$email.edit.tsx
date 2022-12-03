import * as z from "zod"
import type { ActionFunction, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import invariant from "tiny-invariant"

import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from "@mui/material"

import { requireUser } from "~/session.server"
import { getUserByEmail, Role, updateUser } from "~/models/user.server"
import { validateAction, Zod } from "~/utils/validation"
import { useForm } from "~/components/hooks/use-form"

export async function loader({ request, params }: LoaderArgs) {
  const { email } = params
  invariant(email, "email is required")
  const [user, userToEdit] = await Promise.all([
    requireUser(request),
    getUserByEmail(email),
  ])
  invariant(userToEdit, "User not found")
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
  return json({ roles, user: userToEdit })
}

const schema = z
  .object({
    firstName: Zod.name("First name"),
    lastName: Zod.name("Last name"),
    // email: z.,
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

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request)
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  if (user.role !== Role.ADMIN && formData.role >= user.role) {
    return json(
      { errors: { role: "You are not allowed update the user to given role" } },
      { status: 400 },
    )
  }
  const { email } = params
  invariant(email, "email is required")
  await updateUser({
    email,
    ...formData,
  })
  return redirect(`/dashboard/users/${email}`)
}

export default function EditUserPage() {
  const { roles, user } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)

  const convertIsoDateStringToNativeHTMLInputValue = (date: string) => {
    return new Date(date).toLocaleString("en-CA", {
      dateStyle: "short",
    })
  }

  return (
    <Box sx={{ width: "100%", mt: 6 }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Box
          sx={{
            paddingX: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 3,
          }}
        >
          <Form method="post" noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  autoFocus
                  label="First Name"
                  defaultValue={user.firstName}
                  {...register("firstName")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  defaultValue={user.lastName}
                  {...register("lastName")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Faculty"
                  defaultValue={user.faculty}
                  {...register("faculty")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Email Address"
                  defaultValue={user.email}
                  disabled={true}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="user-role">User role</InputLabel>
                  <Select
                    labelId="user-role"
                    label="User role"
                    defaultValue={user.role}
                    disabled={roles.filter(role => !role.disabled).length <= 1}
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
                  defaultValue={convertIsoDateStringToNativeHTMLInputValue(
                    user.agreementStartDate,
                  )}
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
                  defaultValue={convertIsoDateStringToNativeHTMLInputValue(
                    user.agreementEndDate,
                  )}
                  {...register("agreementEndDate")}
                />
              </Grid>
            </Grid>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isBusy}
            >
              {isBusy ? "Saving..." : "Save"}
            </Button>
          </Form>
        </Box>
      </Paper>
    </Box>
  )
}
