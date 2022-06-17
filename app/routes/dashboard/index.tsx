import type { LoaderFunction } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { Box, Paper } from "@mui/material"

import { requireUser } from "~/session.server"

export const loader: LoaderFunction = async ({ request }) =>
  requireUser(request)

export default function DashboardIndexPage() {
  const user = useLoaderData()
  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Paper sx={{ width: "100%", px: 3, py: 2 }}>
        Hello, {user.firstName}!
      </Paper>
    </Box>
  )
}
