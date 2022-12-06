import * as React from "react"
import { useLoaderData, useSearchParams } from "@remix-run/react"
import type { LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"

import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import Grid from "@mui/material/Grid"

import { requireUser } from "~/session.server"
import {
  getAllAssets,
  getUserAccessibleAssets,
  getUserAssets,
} from "~/models/asset.server"
import { Role } from "~/models/user.server"
import { PendingLink } from "~/components/link"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const url = new URL(request.url)
  const onlyMine = url.searchParams.get("only_mine")
  const onlyMineChecked = onlyMine ? onlyMine === "true" : true
  const isAdmin = user.role === Role.ADMIN

  const assets = await (onlyMineChecked
    ? getUserAssets(user.id)
    : isAdmin
    ? getAllAssets()
    : getUserAccessibleAssets(user.id))

  return json({ assets })
}

export default function AssetsIndexPage() {
  const { assets } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")
  const filteredAssets = assets.filter(asset => {
    return asset.name.toLowerCase().includes(query.trim().toLowerCase())
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const onlyMine = searchParams.get("only_mine")
  const isOnlyMine = onlyMine ? onlyMine === "true" : true
  const handleOnlyMineToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams(
      { only_mine: event.target.checked ? "true" : "false" },
      {
        replace: false,
      },
    )
  }

  return (
    <>
      <Grid container>
        <Grid item xs={12}>
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
          <FormControlLabel
            control={
              <Switch checked={isOnlyMine} onChange={handleOnlyMineToggle} />
            }
            label="Only mine"
          />
        </Grid>
        <Grid item xs={12}>
          {filteredAssets.length === 0 ? (
            <p>No assets found</p>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table aria-label="collapsible table">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Name</TableCell>
                    <TableCell align="center">Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssets.map(asset => (
                    <TableRow
                      key={asset.id}
                      sx={{ "& > *": { borderBottom: "unset" } }}
                    >
                      <TableCell component="th" scope="row">
                        {asset.type}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "primary.main" }}>
                        <PendingLink to={`/dashboard/assets/${asset.id}`}>
                          {asset.name}
                        </PendingLink>
                      </TableCell>
                      <TableCell align="center">{asset.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </>
  )
}
