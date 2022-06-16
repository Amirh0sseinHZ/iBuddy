import type { LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

import { requireUserId } from "~/session.server"
import { getMenteeListItems } from "~/models/mentee.server"
import { CollapsibleTable } from "~/components/table"
import { getCountryFromCode } from "~/utils/country"

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request)
  const mentees = await getMenteeListItems({ buddyId: userId })
  const list = mentees.map(mentee => {
    const country = getCountryFromCode(mentee.countryCode)
    return {
      email: mentee.email,
      fullName: mentee.fullName,
      homeUniversity: mentee.homeUniversity,
      hostFaculty: mentee.hostFaculty,
      gender: mentee.gender,
      degree: mentee.degree,
      notes: mentee.notes,
      country,
    }
  })
  return json({ mentees: list })
}

export default function MenteesIndexPage() {
  const data = useLoaderData()

  return <CollapsibleTable rows={data.mentees} />
}
