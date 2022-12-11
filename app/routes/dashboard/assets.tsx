import { Outlet } from "@remix-run/react"
import type { LinksFunction } from "@remix-run/server-runtime"
import type { MetaFunction } from "@remix-run/server-runtime"

export const meta: MetaFunction = () => {
  return {
    title: "Asset management",
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://unpkg.com/react-quill@1.3.3/dist/quill.snow.css",
    },
  ]
}

export default function AssetsLayout() {
  return <Outlet />
}
