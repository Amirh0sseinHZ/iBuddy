import { createCookieSessionStorage } from "@remix-run/node"

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "__session",
      maxAge: 0,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secrets: [process.env.SESSION_SECRET],
      secure: process.env.NODE_ENV === "production",
    },
  })
