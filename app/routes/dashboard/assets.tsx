import { Outlet } from "@remix-run/react"
import type { LinksFunction } from "@remix-run/server-runtime"
import type { MetaFunction } from "@remix-run/server-runtime"

import localQuillStyles from "~/styles/quill.css"

export const meta: MetaFunction = () => {
  return {
    title: "Asset management - iBuddy",
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://unpkg.com/react-quill@1.3.3/dist/quill.snow.css",
    },
    {
      rel: "stylesheet",
      href: localQuillStyles,
    },
  ]
}

export default function AssetsLayout() {
  return <Outlet />
}
