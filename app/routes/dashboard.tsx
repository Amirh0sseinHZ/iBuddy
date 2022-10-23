import type { LoaderArgs, MetaFunction } from "@remix-run/node"
import { Outlet, useLoaderData } from "@remix-run/react"

import { Dashboard } from "~/components/dashboard/"
import { requireUser } from "~/session.server"

export default function DashboardRoute() {
  const user = useLoaderData<typeof loader>()
  return (
    <Dashboard user={user}>
      <Outlet />
    </Dashboard>
  )
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  return user
}

export const meta: MetaFunction = () => {
  return {
    title: "Dashboard",
  }
}
