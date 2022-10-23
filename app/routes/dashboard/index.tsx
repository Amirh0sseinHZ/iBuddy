import type { LoaderArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { Box, Paper } from "@mui/material"

import { requireUser } from "~/session.server"

export function loader({ request }: LoaderArgs) {
  return requireUser(request)
}

export default function DashboardIndexPage() {
  const { firstName } = useLoaderData<typeof loader>()
  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Paper sx={{ width: "100%", px: 3, py: 2 }}>Hello, {firstName}!</Paper>
    </Box>
  )
}
