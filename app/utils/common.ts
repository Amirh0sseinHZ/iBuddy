import { useMatches } from "@remix-run/react"
import { useMemo } from "react"
import type { Mentee, MenteeStatus } from "~/models/mentee.server"

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
    .replace(/[_]/g, " ")
    .replace(/[^a-z\s_]/gi, "")
    .replace(/^\w/, match => match.toUpperCase())
}

export function getHumanReadableDegree(degree: Mentee["degree"]): string {
  switch (degree) {
    case "bachelor":
      return "Bachelor's"
    case "master":
      return "Master's"
    case "others":
      return "Others"
    default:
      throw new Error(`Unknown degree: ${degree}`)
  }
}

export const isEmptyHtml = (str: string) =>
  str.replace(/<[^>]+>/g, "").trim() === ""
