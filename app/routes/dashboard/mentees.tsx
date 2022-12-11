import { Outlet } from "@remix-run/react"
import type { MetaFunction } from "@remix-run/server-runtime"

export const meta: MetaFunction = () => {
  return {
    title: "Mentee management",
  }
}

export default function MenteesLayout() {
  return <Outlet />
}
