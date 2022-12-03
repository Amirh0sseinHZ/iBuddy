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

import { requireUser } from "~/session.server"
import { getCountryFromCode } from "~/utils/country"
import { getAllMentees, getMenteeListItems } from "~/models/mentee.server"
import { Role } from "~/models/user.server"
import { PendingLink } from "~/components/link"

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
  return json({ mentees: list })
}

export default function MenteesIndexPage() {
  const { mentees } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")

  const filteredMentees = mentees.filter(mentee => {
    const fullName = `${mentee.firstName} ${mentee.lastName}`
    return fullName.toLowerCase().includes(query.trim().toLowerCase())
  })

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
      {filteredMentees.length === 0 ? (
        <p>No mentees found</p>
      ) : (
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
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMentees.map(mentee => (
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
                  <TableCell align="center">{mentee.homeUniversity}</TableCell>
                  <TableCell align="center">{mentee.hostFaculty}</TableCell>
                  <TableCell align="center">{mentee.email}</TableCell>
                  <TableCell align="center">{mentee.gender}</TableCell>
                  <TableCell align="center">{mentee.degree}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  )
}
