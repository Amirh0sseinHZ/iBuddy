import type { LoaderArgs } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import type { User } from "~/models/user.server"
import { getBuddyByEmail, Role } from "~/models/user.server"
import { requireUser } from "~/session.server"

export async function loader({ request, params }: LoaderArgs) {
  const user = await requireUser(request)
  if (user.role === Role.BUDDY) {
    return new Response("Forbidden", { status: 403 })
  }
  const buddyId = params.buddyId as User["id"]
  invariant(buddyId, "buddyId is required")
  const buddy = await getBuddyByEmail(buddyId)
  invariant(buddy, "buddy not found")
  return buddy
}
