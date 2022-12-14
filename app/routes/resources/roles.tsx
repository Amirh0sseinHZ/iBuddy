import type { LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import { Role } from "~/models/user.server"
import { requireUser } from "~/session.server"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const roles = [
    {
      role: Role.BUDDY,
      label: "Buddy",
      disabled: false,
    },
    {
      role: Role.HR,
      label: "HR",
      disabled: user.role <= Role.HR,
    },
    {
      role: Role.PRESIDENT,
      label: "President",
      disabled: user.role <= Role.PRESIDENT,
    },
    {
      role: Role.ADMIN,
      label: "Admin",
      disabled: user.role !== Role.ADMIN,
    },
  ]
  return json({ roles })
}
