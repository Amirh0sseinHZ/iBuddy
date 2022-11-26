import * as React from "react"
import type { LoaderArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"

import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"

import { requireUser } from "~/session.server"
import { getUserListItems, Role } from "~/models/user.server"
import { UserRoleChip } from "~/components/chips"
import { getMenteeCount } from "~/models/mentee.server"
import { PendingLink } from "~/components/link"
import { Typography } from "@mui/material"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  if (user.role === Role.BUDDY) {
    return redirect("/dashboard")
  }
  const users = await getUserListItems()
  const usersAndMenteeCounts = await Promise.all(
    users.map(async user => {
      return {
        ...user,
        countOfMentees: await getMenteeCount({ buddyId: user.id }),
      }
    }),
  )
  return json({ usersAndMenteeCounts })
}

export default function UsersIndexPage() {
  const { usersAndMenteeCounts } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")

  const filteredUsers = usersAndMenteeCounts.filter(user =>
    user.fullName.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <>
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
      {filteredUsers.length === 0 ? (
        <p>No users found</p>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="center">Email address</TableCell>
                <TableCell align="center">Faculty</TableCell>
                <TableCell align="center">Mentees</TableCell>
                <TableCell align="center">Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map(user => {
                return (
                  <React.Fragment key={user.id}>
                    <TableRow
                      id={user.id}
                      sx={{ "& > *": { borderBottom: "unset" } }}
                    >
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ textDecoration: "underline" }}
                      >
                        <PendingLink to={`/dashboard/users/${user.id}`}>
                          {user.fullName}
                        </PendingLink>
                      </TableCell>
                      <TableCell align="center">{user.email}</TableCell>
                      <TableCell align="center">{user.faculty}</TableCell>
                      <TableCell align="center">
                        {user.countOfMentees}
                      </TableCell>
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
      )}
    </>
  )
}
