import * as React from "react"
import * as z from "zod"
import type { ActionFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { json } from "@remix-run/node"

import {
  Box,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import { Form, useActionData, useTransition } from "@remix-run/react"

import { useUser } from "~/utils/user"
import { useForm } from "~/components/hooks/use-form"
import { validateAction, Zod } from "~/utils/validation"
import { createMentee, createNote } from "~/models/mentee.server"
import { requireUserId } from "~/session.server"
import { CountrySelect } from "~/components/country-select"
import { getCountryCodeFromName } from "~/utils/country"

export default function NewMenteePage() {
  const user = useUser()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isSubmitting = transition.state === "submitting"

  const [gender, setGender] = React.useState("male")
  const [degree, setDegree] = React.useState("bachelor")

  const handleChangeGender = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGender((event.target as HTMLInputElement).value)
  }

  const handleChangeDegree = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDegree((event.target as HTMLInputElement).value)
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
                <CountrySelect
                  inputProps={{ required: true, ...register("country") }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Home University"
                  {...register("homeUniversity")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Host Faculty"
                  {...register("hostFaculty")}
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
                <FormControl required>
                  <FormLabel id="gender-row-radio-buttons-group-label">
                    Gender
                  </FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="gender-row-radio-buttons-group-label"
                    name="gender"
                    value={gender}
                    onChange={handleChangeGender}
                  >
                    <FormControlLabel
                      value="male"
                      control={<Radio />}
                      label="Male"
                    />
                    <FormControlLabel
                      value="female"
                      control={<Radio />}
                      label="Female"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl required>
                  <FormLabel id="degree-row-radio-buttons-group-label">
                    Degree
                  </FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="degree-row-radio-buttons-group-label"
                    name="degree"
                    value={degree}
                    onChange={handleChangeDegree}
                  >
                    <FormControlLabel
                      value="bachelor"
                      control={<Radio />}
                      label="Bachelor's"
                    />
                    <FormControlLabel
                      value="master"
                      control={<Radio />}
                      label="Master's"
                    />
                    <FormControlLabel
                      value="others"
                      control={<Radio />}
                      label="Others"
                    />
                  </RadioGroup>
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
              <Grid item xs={12}>
                <FormControl disabled fullWidth required>
                  <InputLabel id="buddy-select-label">Buddy</InputLabel>
                  <Select value={0} labelId="buddy-select-label" label="Buddy">
                    <MenuItem value={0}>{user.fullName}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  label="Notes"
                  rows={6}
                  {...register("notes")}
                />
              </Grid>
            </Grid>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Register {isSubmitting && "..."}
            </Button>
          </Form>
        </Box>
      </Paper>
    </Box>
  )
}

const schema = z
  .object({
    firstName: Zod.name("First name"),
    lastName: Zod.name("Last name"),
    country: Zod.country(),
    email: Zod.email(),
    homeUniversity: Zod.requiredString("Home university"),
    hostFaculty: Zod.requiredString("Home faculty"),
    agreementStartDate: Zod.dateString("Start date"),
    agreementEndDate: Zod.dateString("End date"),
    notes: z.string().max(2000, "Note cannot be too long").optional(),
    degree: z.enum(["bachelor", "master", "others"]),
    gender: z.enum(["male", "female"]),
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
  const userId = await requireUserId(request)
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }

  const { country, notes, ...restOfForm } = formData
  const countryCode = getCountryCodeFromName(country)
  if (!countryCode) {
    return json({ errors: { country: "Invalid country" } }, { status: 400 })
  }

  const mentee = await createMentee({
    ...restOfForm,
    countryCode,
    buddyId: userId,
  })

  if (notes) {
    await createNote({
      menteeId: mentee.id,
      content: notes,
    })
  }
  return redirect("/dashboard/mentees")
}
