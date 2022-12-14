import {
  Form,
  Link as RemixLink,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/server-runtime"
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
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
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
import { PagePaper } from "~/components/layout"

export const meta: MetaFunction = ({ data }) => {
  const { user } = data as SerializeFrom<typeof loader>
  const userFullName = `${user.firstName} ${user.lastName}`
  return {
    title: `${userFullName} - iBuddy`,
  }
}

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
    <Grid container spacing={2}>
      <Grid
        item
        xs={12}
        container
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid item xs={9}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography
              component="h1"
              variant="h4"
              sx={{ color: "#505050", fontWeight: 600 }}
            >
              {userFullName}
            </Typography>
            <UserRoleChip role={user.role} />
          </Stack>
        </Grid>
        <Grid item xs={3} container justifyContent="flex-end">
          <Stack direction="row" spacing={1}>
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
          </Stack>
        </Grid>
      </Grid>
      <Grid item xs={12} container spacing={2}>
        <Grid item xs={12} lg={6}>
          <PagePaper>
            <BackgroundLetterAvatars
              name={userFullName}
              sx={{
                width: 120,
                height: 120,
                fontSize: 48,
                float: "right",
              }}
            />
            {Object.entries({
              Email: (
                <Link
                  target="_blank"
                  href={`mailto:${user.email}`}
                  sx={{
                    textDecoration: "none",
                  }}
                >
                  {user.email}
                </Link>
              ),
              Faculty: user.faculty,
              "Agreement Start Date": new Date(
                user.agreementStartDate,
              ).toLocaleDateString(),
              "Agreement End Date": new Date(
                user.agreementEndDate,
              ).toLocaleDateString(),
            }).map(([key, value]) => (
              <Typography
                key={key}
                variant="body1"
                sx={{ mt: 1, display: "flex" }}
              >
                <Box fontWeight="fontWeightMedium" display="inline">
                  {key}
                </Box>
                {": \u00A0"}
                {value}
              </Typography>
            ))}
            <Box sx={{ clear: "both" }} />
          </PagePaper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper>
            <List>
              {user.mentees.map((mentee, idx) => {
                const menteeFullName = `${mentee.firstName} ${mentee.lastName}`
                const isLast = idx === user.mentees.length - 1
                return (
                  <Link
                    component={PendingLink}
                    to={`/dashboard/mentees/${mentee.id}`}
                    key={mentee.id}
                  >
                    <ListItemButton>
                      <ListItemAvatar>
                        <BackgroundLetterAvatars name={menteeFullName} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={menteeFullName}
                        secondary={getHumanReadableMenteeStatus(mentee.status)}
                      />
                    </ListItemButton>
                    {isLast ? null : <Divider variant="inset" component="li" />}
                  </Link>
                )
              })}
              {user.mentees.length === 0 && (
                <div style={{ textAlign: "center" }}>
                  <Typography variant="h3">😕</Typography>
                  <Typography variant="h5">Has no mentees!</Typography>
                </div>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Grid>
  )
}
