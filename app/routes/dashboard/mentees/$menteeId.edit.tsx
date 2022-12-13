import * as z from "zod"
import type {
  ActionFunction,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { json } from "@remix-run/node"
import invariant from "tiny-invariant"

import {
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
  OutlinedInput,
  Typography,
} from "@mui/material"
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react"

import { useForm } from "~/components/hooks/use-form"
import { validateAction, Zod } from "~/utils/validation"
import {
  getMenteeById,
  MENTEE_STATUS,
  updateMentee,
} from "~/models/mentee.server"
import { requireUser } from "~/session.server"
import { CountrySelect } from "~/components/country-select"
import { getCountryCodeFromName, getCountryFromCode } from "~/utils/country"
import type { User } from "~/models/user.server"
import { getBuddyById, Role } from "~/models/user.server"
import { useBuddyList } from "../../resources/buddies"
import { getHumanReadableMenteeStatus } from "~/utils/common"
import { PagePaper } from "~/components/layout"

export const meta: MetaFunction = ({ data }) => {
  const { mentee } = data as SerializeFrom<typeof loader>
  const menteeFullName = `${mentee.firstName} ${mentee.lastName}`
  return {
    title: `Edit ${menteeFullName} - iBuddy`,
  }
}

export async function loader({ request, params }: LoaderArgs) {
  const user = await requireUser(request)
  if (user.role === Role.BUDDY) {
    return redirect("/dashboard")
  }
  const { menteeId } = params
  invariant(menteeId, "Mentee ID is required")
  const mentee = await getMenteeById(menteeId)
  invariant(mentee, "Mentee not found")
  return json({ mentee, statuses: Object.values(MENTEE_STATUS) })
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
    degree: z.enum(["bachelor", "master", "others"]),
    gender: z.enum(["male", "female"]),
    buddyId: z.string().refine(id => getBuddyById(id as User["id"]), {
      message: "Buddy does not exist",
    }),
    status: z.nativeEnum(MENTEE_STATUS),
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
  invariant(user.role !== Role.BUDDY, "Forbidden")
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  const { country, buddyId, ...restOfForm } = formData
  const countryCode = getCountryCodeFromName(country)
  if (!countryCode) {
    return json({ errors: { country: "Invalid country" } }, { status: 400 })
  }
  const { menteeId } = params
  invariant(menteeId, "Mentee ID is required")
  const mentee = await updateMentee({
    id: menteeId,
    countryCode,
    buddyId: buddyId as User["id"],
    ...restOfForm,
  })
  return redirect(`/dashboard/mentees/${mentee.id}`)
}

export default function EditMenteePage() {
  const { mentee, statuses } = useLoaderData<typeof loader>()
  const { list: buddyList, isLoading: isBuddyListLoading } = useBuddyList()
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
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          Edit mentee
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
                  defaultValue={mentee.firstName}
                  {...register("firstName")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  defaultValue={mentee.lastName}
                  {...register("lastName")}
                />
              </Grid>
              <Grid item xs={12}>
                <CountrySelect
                  defaultValue={getCountryFromCode(mentee.countryCode)}
                  inputProps={{
                    required: true,
                    ...register("country"),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Home University"
                  defaultValue={mentee.homeUniversity}
                  {...register("homeUniversity")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Host Faculty"
                  defaultValue={mentee.hostFaculty}
                  {...register("hostFaculty")}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Email Address"
                  defaultValue={mentee.email}
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
                    defaultValue={mentee.gender}
                    {...register("gender")}
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
                    defaultValue={mentee.degree}
                    {...register("degree")}
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
                  defaultValue={convertIsoDateStringToNativeHTMLInputValue(
                    mentee.agreementStartDate,
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
                    mentee.agreementEndDate,
                  )}
                  {...register("agreementEndDate")}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl disabled={isBuddyListLoading} fullWidth required>
                  <InputLabel id="buddy-select-label">Buddy</InputLabel>
                  <Select
                    labelId="buddy-select-label"
                    label="Buddy"
                    defaultValue={mentee.buddyId}
                    {...register("buddyId")}
                  >
                    {buddyList.map(buddy => (
                      <MenuItem key={buddy.id} value={buddy.id}>
                        {`${buddy.firstName} ${buddy.lastName}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="demo-dialog-select-label">Status</InputLabel>
                  <Select
                    defaultValue={mentee.status}
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    input={<OutlinedInput label="Status" />}
                    {...register("status")}
                  >
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {getHumanReadableMenteeStatus(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isBusy}
            >
              {isBusy ? "Saving..." : "Save"}
            </Button>
          </Form>
        </PagePaper>
      </Grid>
    </Grid>
  )
}
