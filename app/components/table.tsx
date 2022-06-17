import * as React from "react"

import Box from "@mui/material/Box"
import Collapse from "@mui/material/Collapse"
import IconButton from "@mui/material/IconButton"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"

import { mdiChevronDown, mdiChevronUp } from "@mdi/js"
import Icon from "@mdi/react"

function Row({ row }: { row: any }) {
  const [open, setOpen] = React.useState(false)

  return (
    <React.Fragment>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            <Icon size={1} path={open ? mdiChevronUp : mdiChevronDown} />
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.fullName}
        </TableCell>
        <TableCell align="center">
          <img
            loading="lazy"
            width="20"
            src={`https://flagcdn.com/w20/${row.country?.code?.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w40/${row.country?.code?.toLowerCase()}.png 2x`}
            alt="No flag found"
            title={row.country?.label}
          />
        </TableCell>
        <TableCell align="center">{row.homeUniversity}</TableCell>
        <TableCell align="center">{row.hostFaculty}</TableCell>
        <TableCell align="center">{row.email}</TableCell>
        <TableCell align="center">{row.gender}</TableCell>
        <TableCell align="center">{row.degree}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Notes
              </Typography>
              <Typography
                gutterBottom
                variant={row.notes ? "body1" : "caption"}
              >
                {row.notes ? row.notes : "There is no note yet :("}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  )
}

export function CollapsibleTable({ rows }: { rows: any[] }) {
  const [query, setQuery] = React.useState("")

  const filteredRows = rows.filter(row =>
    row.fullName.toLowerCase().includes(query.trim().toLowerCase()),
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
            {filteredRows.map(row => (
              <Row key={row.email} row={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
