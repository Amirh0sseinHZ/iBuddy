import * as React from "react"
import type { LoaderArgs } from "@remix-run/server-runtime"
import { useFetcher } from "@remix-run/react"

import type { User } from "~/models/user.server"
import { getUserListItems } from "~/models/user.server"
import { requireUserId } from "~/session.server"

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request)
  return getUserListItems()
}

export function useUserList(): { list: User[]; isLoading: boolean } {
  const fetcher = useFetcher()

  const { data: users } = fetcher as { data: User[] | undefined }

  React.useEffect(() => {
    if (fetcher.type === "init") {
      fetcher.load("/resources/users")
    }
  }, [fetcher])

  return { list: users ?? [], isLoading: fetcher.state === "submitting" }
}
