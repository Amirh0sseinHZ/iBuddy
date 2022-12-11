import {
  Form,
  Link as RemixLink,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import {
  Box,
  Button,
  Divider,
  Grid,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material"

import {
  canUserDeleteUser,
  deleteUserByEmail,
  getUserByEmail,
} from "~/models/user.server"
import { BackgroundLetterAvatars } from "~/components/avatar"
import { UserRoleChip } from "~/components/chips"
import { getMenteeListItems } from "~/models/mentee.server"
import { requireUser } from "~/session.server"
import { getHumanReadableMenteeStatus } from "~/utils/common"
import { PendingLink } from "~/components/link"
import { pick } from "~/utils/object"

export async function loader({ params, request }: LoaderArgs) {
  const { email } = params
  invariant(email, "email is required")
  const loggedInUser = await requireUser(request)
  const userToShow = await getUserByEmail(email)
  invariant(userToShow, "User not found")
  const [mentees, canBeDeleted] = await Promise.all([
    getMenteeListItems({ buddyId: userToShow.id }),
    canUserDeleteUser({
      loggedInUser,
      userToDelete: userToShow,
    }),
  ])
  const user = {
    ...userToShow,
    mentees: mentees.map(mentee =>
      pick(mentee, "id", "status", "firstName", "lastName"),
    ),
  }
  return json({
    user: pick(
      user,
      "id",
      "email",
      "firstName",
      "lastName",
      "faculty",
      "role",
      "mentees",
      "agreementStartDate",
      "agreementEndDate",
    ),
    canBeDeleted,
  })
}

export async function action({ params, request }: ActionArgs) {
  const loggedInUser = await requireUser(request)
  const { email } = params
  invariant(email, "email is required")

  const userToDelete = await getUserByEmail(email)
  invariant(userToDelete, "userToDelete not found")

  const { canDelete } = await canUserDeleteUser({
    loggedInUser,
    userToDelete,
  })
  invariant(canDelete, "User cannot be deleted")

  await deleteUserByEmail(email)
  return redirect("/dashboard/users")
}

export default function UserPage() {
  const {
    user,
    canBeDeleted: { canDelete: canBeDeleted, reason: cannotDeleteReason },
  } = useLoaderData<typeof loader>()
  const transition = useTransition()
  const isDeleting =
    transition.state !== "idle" && Boolean(transition.submission)
  const userFullName = `${user.firstName} ${user.lastName}`

  return (
    <Box sx={{ width: "100%", mt: 6 }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Grid container>
          <Grid container sx={{ paddingY: 4, paddingX: 2 }}>
            <Grid item xs={5} lg={3}>
              <Box sx={{ paddingX: 2 }}>
                <BackgroundLetterAvatars
                  name={userFullName}
                  sx={{
                    width: "100%",
                    aspectRatio: "1/1",
                    height: "auto",
                    borderRadius: 5,
                  }}
                  variant="square"
                />
              </Box>
            </Grid>
            <Grid item xs={7} lg={9}>
              <Box sx={{ paddingX: 2 }}>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {userFullName} <UserRoleChip role={user.role} />
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    component={RemixLink}
                    to={`/dashboard/users/${user.email}/edit`}
                  >
                    Edit
                  </Button>
                  <Tooltip title={cannotDeleteReason}>
                    <Form method="post">
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!canBeDeleted || isDeleting}
                        type="submit"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </Form>
                  </Tooltip>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <Box fontWeight="fontWeightMedium" display="inline">
                    Email
                  </Box>
                  {": "}
                  <Link target="_blank" href={`mailto:${user.email}`}>
                    {user.email}
                  </Link>
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <Box fontWeight="fontWeightMedium" display="inline">
                    Faculty
                  </Box>
                  {": "}
                  {user.faculty}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <Box fontWeight="fontWeightMedium" display="inline">
                    Agreement start date
                  </Box>
                  {": "}
                  {new Date(user.agreementStartDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <Box fontWeight="fontWeightMedium" display="inline">
                    Agreement end date
                  </Box>
                  {": "}
                  {new Date(user.agreementEndDate).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h5" sx={{ padding: 2 }}>
              Mentees ({user.mentees.length})
            </Typography>
            <List sx={{ width: "100%", bgcolor: "background.paper" }}>
              {user.mentees.map(mentee => {
                const menteeFullName = `${mentee.firstName} ${mentee.lastName}`
                return (
                  <Link
                    component={PendingLink}
                    to={`/dashboard/mentees/${mentee.id}`}
                    key={mentee.id}
                  >
                    <ListItem>
                      <ListItemAvatar>
                        <BackgroundLetterAvatars name={menteeFullName} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={menteeFullName}
                        secondary={getHumanReadableMenteeStatus(mentee.status)}
                      />
                    </ListItem>
                  </Link>
                )
              })}
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
