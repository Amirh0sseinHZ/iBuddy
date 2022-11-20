import * as React from "react"
import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { NavLink, Outlet, useLoaderData, useParams } from "@remix-run/react"

import IconButton from "@mui/material/IconButton"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"

import { mdiChevronDown, mdiChevronUp } from "@mdi/js"
import Icon from "@mdi/react"

import { requireUserId } from "~/session.server"
import { getCountryFromCode } from "~/utils/country"
import { getMenteeListItems } from "~/models/mentee.server"

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request)
  const mentees = await getMenteeListItems({ buddyId: userId })
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
  const { menteeId } = useParams()

  const filteredMentees = mentees.filter(mentee =>
    mentee.fullName.toLowerCase().includes(query.trim().toLowerCase()),
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
      {filteredMentees.length === 0 ? (
        <p>No mentees found</p>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table aria-label="collapsible table">
            <TableHead>
              <TableRow>
                <TableCell />
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
              {filteredMentees.map(mentee => {
                const isExpanded = mentee.id === menteeId
                return (
                  <React.Fragment key={mentee.id}>
                    <TableRow
                      id={mentee.id}
                      sx={{ "& > *": { borderBottom: "unset" } }}
                    >
                      <TableCell>
                        <NavLink to={mentee.id}>
                          <IconButton aria-label="expand row" size="small">
                            <Icon
                              size={1}
                              path={isExpanded ? mdiChevronUp : mdiChevronDown}
                            />
                          </IconButton>
                        </NavLink>
                      </TableCell>
                      <TableCell component="th" scope="row">
                        {mentee.fullName}
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
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={6}
                      >
                        {isExpanded ? <Outlet /> : null}
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
