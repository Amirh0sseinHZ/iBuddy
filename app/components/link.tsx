import { Link, useResolvedPath, useTransition } from "@remix-run/react"

export function PendingLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  const transition = useTransition()
  const path = useResolvedPath(to)

  const isPending =
    transition.state === "loading" &&
    transition.location.pathname === path.pathname

  return (
    <Link
      data-pending={isPending ? "true" : null}
      to={to}
      children={children}
      style={{
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
    />
  )
}
