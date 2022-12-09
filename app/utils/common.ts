import { useMatches } from "@remix-run/react"
import { useMemo } from "react"
import type { MenteeStatus } from "~/models/mentee.server"

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
  id: string,
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches()
  const route = useMemo(
    () => matchingRoutes.find(route => route.id === id),
    [matchingRoutes, id],
  )
  return route?.data
}

export function getHumanReadableMenteeStatus(status: MenteeStatus): string {
  return status
    .replace(/[^a-z]/gi, "")
    .replace(/^\w/, match => match.toUpperCase())
}
