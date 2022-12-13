import type { LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import { createUser, getUserByEmail, Role } from "~/models/user.server"
import { generateRandomPassword } from "~/utils/common"

export async function loader({ request }: LoaderArgs) {
  const { SEED_SECRET, SEED_EMAIL } = process.env
  invariant(SEED_SECRET && SEED_EMAIL, "ENV variables are missing")

  const url = new URL(request.url)
  const secret = url.searchParams.get("secret")
  invariant(secret === SEED_SECRET, "Forbidden")

  // if already seeded, error out
  const maybeAdmin = await getUserByEmail(SEED_EMAIL)
  invariant(!maybeAdmin, "Forbidden")

  const randomPassword = generateRandomPassword()
  const admin = await createUser({
    firstName: "Admin",
    lastName: "User",
    email: SEED_EMAIL,
    password: randomPassword,
    role: Role.ADMIN,
    faculty: "Faculty of Computer Science",
    agreementStartDate: new Date().toISOString(),
    agreementEndDate: new Date(
      new Date().setFullYear(new Date().getFullYear() + 1),
    ).toISOString(),
  })

  return json({ username: admin.email, password: randomPassword })
}
