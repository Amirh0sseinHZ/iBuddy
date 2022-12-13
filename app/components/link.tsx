import {
  Link as RemixLink,
  NavLink,
  useLocation,
  useResolvedPath,
  useTransition,
} from "@remix-run/react"
import type { LinkProps } from "@mui/material/Link"
import MuiLink from "@mui/material/Link"

export function PendingLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  const isPending = useIsPendingLink(to)

  return (
    <RemixLink
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

export function PendingMuiLink({
  to,
  sx,
  ...restOfProps
}: {
  to: string
} & LinkProps) {
  const isPending = useIsPendingLink(to)

  return (
    <MuiLink
      data-pending={isPending ? "true" : null}
      component={RemixLink}
      to={to}
      style={{
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
      sx={{
        textDecoration: "none",
        ...sx,
      }}
      {...restOfProps}
    />
  )
}

export function PendingNavLink({
  to,
  activeClassName,
  children,
}: {
  to: string
  activeClassName: string
  children: React.ReactNode
}) {
  const isPending = useIsPendingLink(to)
  const { pathname } = useLocation()
  const isExactMatch = to === pathname

  return (
    <NavLink
      data-pending={isPending ? "true" : null}
      to={to}
      children={children}
      style={{
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
      className={({ isActive }) =>
        isActive && isExactMatch ? activeClassName : undefined
      }
    />
  )
}

function useIsPendingLink(to: string): boolean {
  const transition = useTransition()
  const path = useResolvedPath(to)

  return (
    transition.state === "loading" &&
    transition.location.pathname === path.pathname
  )
}
