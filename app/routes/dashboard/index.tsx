import type { LoaderArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

import { requireUser } from "~/session.server"
import { PagePaper } from "~/components/layout"

export function loader({ request }: LoaderArgs) {
  return requireUser(request)
}

export default function DashboardIndexPage() {
  const { firstName } = useLoaderData<typeof loader>()
  return <PagePaper>Hello, {firstName}!</PagePaper>
}
