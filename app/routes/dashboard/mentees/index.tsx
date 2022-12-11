import * as z from "zod"
import * as React from "react"
import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import {
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
} from "@remix-run/react"

import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import type { TooltipProps } from "@mui/material/Tooltip"
import Tooltip from "@mui/material/Tooltip"
import type { IconProps } from "@mdi/react/dist/IconProps"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import Box from "@mui/material/Box"
import FormControl from "@mui/material/FormControl"
import OutlinedInput from "@mui/material/OutlinedInput"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import type { ChipProps } from "@mui/material/Chip"
import Chip from "@mui/material/Chip"
import { mdiInformationVariant } from "@mdi/js"
import Icon from "@mdi/react"

import { requireUser } from "~/session.server"
import { getCountryFromCode } from "~/utils/country"
import type { Mentee, MenteeStatus } from "~/models/mentee.server"
import { MENTEE_STATUS } from "~/models/mentee.server"
import {
  getAllMentees,
  getMenteeListItems,
  updateMenteeStatus,
} from "~/models/mentee.server"
import { Role } from "~/models/user.server"
import { PendingLink } from "~/components/link"
import { useForm } from "~/components/hooks/use-form"
import { validateAction, Zod } from "~/utils/validation"
import { getHumanReadableMenteeStatus } from "~/utils/common"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const mentees = await (user.role === Role.BUDDY
    ? getMenteeListItems({ buddyId: user.id })
    : getAllMentees())
  const list = mentees.map(mentee => {
    const country = getCountryFromCode(mentee.countryCode)
    return {
      ...mentee,
      country,
    }
  })
  return json({ mentees: list, statuses: Object.values(MENTEE_STATUS) })
}

const schema = z.object({
  id: Zod.requiredString(),
  status: z.nativeEnum(MENTEE_STATUS),
})

type ActionInput = z.TypeOf<typeof schema>

export async function action({ request }: LoaderArgs) {
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  const { id, status } = formData
  await updateMenteeStatus(id, status)
  return null
}

export default function MenteesIndexPage() {
  const { mentees, statuses } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")

  const filteredMentees = mentees.filter(mentee => {
    const fullName = `${mentee.firstName} ${mentee.lastName}`
    return fullName.toLowerCase().includes(query.trim().toLowerCase())
  })

  const [menteeOnDialog, setMenteeOnDialog] = React.useState<Mentee | null>(
    null,
  )
  const isDialogOpen = Boolean(menteeOnDialog)

  const handleCloseDialog = (
    event: React.SyntheticEvent<unknown>,
    reason?: string,
  ) => {
    if (reason !== "backdropClick") {
      setMenteeOnDialog(null)
    }
  }

  const status = useFetcher()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)

  React.useEffect(() => {
    if (status.type === "done") {
      setMenteeOnDialog(null)
    }
  }, [status])

  const isBusy = status.state !== "idle" && Boolean(status.submission)

  return (
    <>
      <Link to="/dashboard/mentees/email">Send an email</Link>
      <TextField
        autoFocus
        type="text"
        placeholder="Search by name..."
        fullWidth
        variant="filled"
        value={query}
        onChange={e => setQuery(e.target.value)}
        sx={{
          mt: 6,
          backgroundColor: "background.grey01",
        }}
      />
      {filteredMentees.length === 0 ? (
        <p>No mentees found</p>
      ) : (
        <div>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table aria-label="collapsible table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="center">Country</TableCell>
                  <TableCell align="center">Home university</TableCell>
                  <TableCell align="center">Host faculty</TableCell>
                  <TableCell align="center">Email address</TableCell>
                  <TableCell align="center">Gender</TableCell>
                  <TableCell align="center">Degree</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMentees.map(mentee => {
                  const chips: Record<
                    MenteeStatus,
                    {
                      icon: IconProps["path"]
                      tooltip: TooltipProps["title"]
                      variant?: ChipProps["variant"]
                      color?: ChipProps["color"]
                      label?: ChipProps["label"]
                    }
                  > = {
                    assigned: {
                      variant: "outlined",
                      color: "default",
                      label: "Assigned",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has been assigned to you. You can now contact them to start the mentorship process.`,
                    },
                    contacted: {
                      variant: "outlined",
                      color: "secondary",
                      label: "Contacted",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has been contacted and we are waiting for their response.`,
                    },
                    in_touch: {
                      variant: "outlined",
                      color: "success",
                      label: "In touch",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has replied to your initial contact. You are now in touch with them.`,
                    },
                    arrived: {
                      variant: "filled",
                      color: "info",
                      label: "Arrived",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has arrived in the country and cannot wait to meet you.`,
                    },
                    met: {
                      variant: "outlined",
                      color: "success",
                      label: "Met",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has finally met you. How exciting!`,
                    },
                    rejected: {
                      variant: "outlined",
                      color: "error",
                      label: "Rejected",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has rejected your mentorship offer. That's okay, not everyone needs a mentor.`,
                    },
                    unresponsive: {
                      variant: "outlined",
                      color: "default",
                      label: "Unresponsive",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has not responded to your initial contact and the follow-up emails.`,
                    },
                    served: {
                      variant: "filled",
                      color: "primary",
                      label: "Serverd",
                      icon: mdiInformationVariant,
                      tooltip: `${mentee.firstName} has been served and their contract is over now.`,
                    },
                  }
                  const menteeChip = chips[mentee.status]
                  return (
                    <TableRow
                      key={mentee.id}
                      id={mentee.id}
                      sx={{ "& > *": { borderBottom: "unset" } }}
                    >
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ color: "primary.main" }}
                      >
                        <PendingLink to={`/dashboard/mentees/${mentee.id}`}>
                          {`${mentee.firstName} ${mentee.lastName}`}
                        </PendingLink>
                      </TableCell>
                      <TableCell align="center">
                        <img
                          loading="lazy"
                          width="20"
                          src={`https://flagcdn.com/w20/${mentee.country?.code?.toLowerCase()}.png`}
                          srcSet={`https://flagcdn.com/w40/${mentee.country?.code?.toLowerCase()}.png 2x`}
                          alt="No flag found"
                          title={mentee.country?.label}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {mentee.homeUniversity}
                      </TableCell>
                      <TableCell align="center">{mentee.hostFaculty}</TableCell>
                      <TableCell align="center">{mentee.email}</TableCell>
                      <TableCell align="center">{mentee.gender}</TableCell>
                      <TableCell align="center">{mentee.degree}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={menteeChip.tooltip} placement="left">
                          <Chip
                            icon={
                              <Icon path={mdiInformationVariant} size={1} />
                            }
                            label={menteeChip.label}
                            variant={menteeChip.variant}
                            color={menteeChip.color}
                            onClick={() => setMenteeOnDialog(mentee)}
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Dialog
            maxWidth="xs"
            open={isDialogOpen}
            onClose={handleCloseDialog}
            fullWidth
            disableEscapeKeyDown
          >
            <DialogTitle>Change mentee status</DialogTitle>
            <status.Form method="post">
              <DialogContent>
                <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                  <FormControl sx={{ m: 1 }} fullWidth>
                    <InputLabel id="demo-dialog-select-label">
                      Status
                    </InputLabel>
                    <Select
                      defaultValue={menteeOnDialog?.status}
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
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button disabled={isBusy} type="submit">
                  Save
                </Button>
              </DialogActions>
              <input type="hidden" name="id" value={menteeOnDialog?.id} />
            </status.Form>
          </Dialog>
        </div>
      )}
    </>
  )
}
