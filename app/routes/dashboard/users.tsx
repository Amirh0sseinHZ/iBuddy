import type { LoaderArgs, MetaFunction } from "@remix-run/node"
import { Outlet } from "@remix-run/react"

import { requireNonBuddyUser } from "~/session.server"

export const meta: MetaFunction = () => {
  return {
    title: "User management",
  }
}

export async function loader({ request }: LoaderArgs) {
  await requireNonBuddyUser(request)
  return null
}

export default function UsersLayout() {
  return <Outlet />
}
