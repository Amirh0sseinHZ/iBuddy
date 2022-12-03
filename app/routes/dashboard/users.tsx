import type { LoaderArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { Outlet } from "@remix-run/react"

import { requireUser } from "~/session.server"
import { Role } from "~/models/user.server"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  if (user.role === Role.BUDDY) {
    return redirect("/dashboard")
  }
  return null
}

export default function UsersLayout() {
  return <Outlet />
}
