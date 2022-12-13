import * as React from "react"
import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"

import { getUserListItems, Role } from "~/models/user.server"
import { UserRoleChip } from "~/components/chips"
import { getMenteeCount } from "~/models/mentee.server"
import { PendingLink } from "~/components/link"
import { pick } from "~/utils/object"

export async function loader({ request }: LoaderArgs) {
  const users = await getUserListItems()
  const usersAndMenteeCounts = await Promise.all(
    users.map(async user => {
      return {
        ...user,
        countOfMentees: await getMenteeCount({ buddyId: user.id }),
      }
    }),
  )
  const sortedUsers = usersAndMenteeCounts.sort((a, b) => {
    const sortOrder = [Role.ADMIN, Role.PRESIDENT, Role.HR, Role.BUDDY]
    if (sortOrder.indexOf(a.role) === sortOrder.indexOf(b.role)) {
      return b.countOfMentees - a.countOfMentees
    } else {
      return sortOrder.indexOf(a.role) - sortOrder.indexOf(b.role)
    }
  })
  return json({
    users: sortedUsers.map(user =>
      pick(
        user,
        "firstName",
        "lastName",
        "email",
        "role",
        "countOfMentees",
        "faculty",
      ),
    ),
  })
}

export default function UsersIndexPage() {
  const { users } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`
    return fullName.toLowerCase().includes(query.trim().toLowerCase())
  })

  const resultTable = (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="center">Faculty</TableCell>
            <TableCell align="center">Mentees</TableCell>
            <TableCell align="center">Role</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredUsers.map(user => {
            return (
              <React.Fragment key={user.email}>
                <TableRow
                  id={user.email}
                  sx={{ "& > *": { borderBottom: "unset" } }}
                >
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ color: "primary.main" }}
                  >
                    <PendingLink to={`/dashboard/users/${user.email}`}>
                      {`${user.firstName} ${user.lastName}`}
                    </PendingLink>
                  </TableCell>
                  <TableCell align="center">{user.faculty}</TableCell>
                  <TableCell align="center">{user.countOfMentees}</TableCell>
                  <TableCell align="center">
                    <UserRoleChip role={user.role} />
                  </TableCell>
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Grid container>
          <Grid item xs={9}>
            <Typography
              component="h1"
              variant="h4"
              sx={{ color: "#505050", fontWeight: 600 }}
            >
              Users
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <TextField
              type="text"
              label="Query"
              placeholder="Search all users by name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              sx={{ backgroundColor: "white" }}
              size="small"
              fullWidth
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <Typography variant="h3">😢</Typography>
            <Typography variant="h5">Could not find anyone!</Typography>
          </div>
        ) : (
          resultTable
        )}
      </Grid>
    </Grid>
  )
}
