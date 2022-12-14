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
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Stack from "@mui/material/Stack"
import Icon from "@mdi/react"
import {
  mdiEmailSealOutline,
  mdiFileDocumentOutline,
  mdiImageOutline,
} from "@mdi/js"

import { requireUser } from "~/session.server"
import {
  getAllAssets,
  getUserAccessibleAssets,
  getUserAssets,
} from "~/models/asset.server"
import { Role } from "~/models/user.server"
import { PendingLink, PendingMuiLink } from "~/components/link"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const url = new URL(request.url)
  const showAll = url.searchParams.get("showAll") === "true"
  const isAdmin = user.role === Role.ADMIN

  const assets = await (showAll
    ? isAdmin
      ? getAllAssets()
      : getUserAccessibleAssets(user.id)
    : getUserAssets(user.id))

  const sortedAssets = assets.sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1,
  )

  return json({ assets: sortedAssets })
}

export default function AssetsIndexPage() {
  const { assets } = useLoaderData<typeof loader>()
  const [query, setQuery] = React.useState("")
  const filteredAssets = assets.filter(asset => {
    return asset.name.toLowerCase().includes(query.trim().toLowerCase())
  })

  const resultTable = (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
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
                {asset.type === "image" && (
                  <Icon title="Image" path={mdiImageOutline} size={1} />
                )}
                {asset.type === "document" && (
                  <Icon
                    title="Document"
                    path={mdiFileDocumentOutline}
                    size={1}
                  />
                )}
                {asset.type === "email-template" && (
                  <Icon
                    title="Email template"
                    path={mdiEmailSealOutline}
                    size={1}
                  />
                )}
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
  )

  const [searchParams] = useSearchParams()
  const showAll = searchParams.get("showAll") === "true"

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
              {showAll ? "All Assets" : "My Assets"}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Stack spacing={2}>
              <TextField
                type="text"
                label="Query"
                placeholder="Search all assets by name..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                sx={{ backgroundColor: "white" }}
                size="small"
                fullWidth
              />

              <PendingMuiLink
                sx={{ textAlign: "right" }}
                to={`?showAll=${!showAll}`}
              >
                {showAll ? "View Mine" : "View All"}
              </PendingMuiLink>
            </Stack>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        {filteredAssets.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <Typography variant="h3">😢</Typography>
            <Typography variant="h5">Could not find any assets!</Typography>
          </div>
        ) : (
          resultTable
        )}
      </Grid>
    </Grid>
  )
}
