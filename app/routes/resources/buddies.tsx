import * as React from "react"
import type { LoaderArgs } from "@remix-run/server-runtime"
import { useFetcher } from "@remix-run/react"

import type { User } from "~/models/user.server"
import { getUserListItems, Role } from "~/models/user.server"
import { requireUser } from "~/session.server"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  if (user.role === Role.BUDDY) {
    return new Response("Forbidden", { status: 403 })
  }
  const users = await getUserListItems()
  const activeBuddies = users.filter(
    user => new Date(user.agreementEndDate) > new Date(),
  )
  return activeBuddies
}

export function useBuddyList(): { list: User[]; isLoading: boolean } {
  const fetcher = useFetcher()

  const { data: buddies } = fetcher as { data: User[] | undefined }
  console.log("🚀 ~ useBuddyList ~ buddies", buddies)

  React.useEffect(() => {
    if (fetcher.type === "init") {
      fetcher.load("/resources/buddies")
    }
  }, [fetcher])

  return { list: buddies ?? [], isLoading: fetcher.state === "submitting" }
}
