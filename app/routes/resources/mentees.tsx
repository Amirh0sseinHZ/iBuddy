import * as React from "react"
import type { LoaderArgs } from "@remix-run/server-runtime"
import { useFetcher } from "@remix-run/react"

import { Role } from "~/models/user.server"
import { requireUser } from "~/session.server"
import type { Mentee } from "~/models/mentee.server"
import { getAllMentees, getMenteeListItems } from "~/models/mentee.server"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const isBuddy = user.role === Role.BUDDY
  const url = new URL(request.url)
  const onlyMine = url.searchParams.get("onlyMine") === "true"
  const mentees = await (onlyMine
    ? getMenteeListItems({ buddyId: user.id })
    : isBuddy
    ? getMenteeListItems({ buddyId: user.id })
    : getAllMentees())
  return mentees
}

export function useMenteeList({
  onlyMine = false,
}: { onlyMine?: boolean } = {}): {
  list: Mentee[]
  isLoading: boolean
} {
  const fetcher = useFetcher()

  const { data: mentees } = fetcher as { data: Mentee[] | undefined }

  React.useEffect(() => {
    if (fetcher.type === "init") {
      fetcher.load(`/resources/mentees/?onlyMine=${onlyMine}`)
    }
  }, [fetcher, onlyMine])

  return { list: mentees ?? [], isLoading: fetcher.state === "submitting" }
}
