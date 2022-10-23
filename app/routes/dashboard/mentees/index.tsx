import type { ActionFunction, LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import invariant from "tiny-invariant"

import { requireUserId } from "~/session.server"
import type { Mentee } from "~/models/mentee.server"
import { deleteMentee, getMenteeListItems } from "~/models/mentee.server"
import { CollapsibleTable } from "~/components/table"
import { getCountryFromCode } from "~/utils/country"

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request)
  const mentees = await getMenteeListItems({ buddyId: userId })
  const list = mentees.map(mentee => {
    const country = getCountryFromCode(mentee.countryCode)
    return {
      ...mentee,
      country,
    }
  })
  return json({ mentees: list })
}

export const action: ActionFunction = async ({ request }) => {
  await requireUserId(request)
  const body = Object.fromEntries(await request.formData())
  const { id } = body as { id: Mentee["id"] }
  invariant(id, "id is required")

  // TODO: make sure they can delete this mentee
  await deleteMentee({ id })
  return {}
}

export default function MenteesIndexPage() {
  const data = useLoaderData()

  return <CollapsibleTable rows={data.mentees} />
}
