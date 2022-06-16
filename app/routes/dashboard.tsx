import { Outlet } from "@remix-run/react"
import { Dashboard } from "~/components/dashboard/"

export default function DashboardRoute() {
  return (
    <Dashboard>
      <Outlet />
    </Dashboard>
  )
}
