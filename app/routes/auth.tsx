import type { LoaderFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { Outlet } from "@remix-run/react"

import { getUserId } from "~/session.server"

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request)
  if (userId) {
    return redirect("/dashboard")
  }
  return {}
}

export default function AuthPage() {
  return <Outlet />
}
