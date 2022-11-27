import type { ActionFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import invariant from "tiny-invariant"

import { createUser, Role } from "~/models/user.server"

export const action: ActionFunction = async ({ request }) => {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 test routes should not be enabled in production 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨",
    )
    // test routes should not be enabled in production or without
    // enable test routes... Just in case this somehow slips through
    // we'll redirect :)
    return redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  }

  const { email, password } = await request.json()
  invariant(email, "email required")
  invariant(
    email.endsWith("@example.com"),
    "All test emails must end in @example.com",
  )
  invariant(password, "password required")

  return await createUser({
    email,
    password,
    firstName: "Test",
    lastName: "User",
    role: Role.ADMIN,
    agreementStartDate: "2022-11-27T16:07:26.636Z",
    agreementEndDate: "2045-02-27T06:03:18.693Z",
    faculty: "Test Faculty",
  })
}

export default null
