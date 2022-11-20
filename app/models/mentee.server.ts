import arc from "@architect/functions"
import cuid from "cuid"
import invariant from "tiny-invariant"

import type { CountryType } from "~/utils/country"
import type { User } from "./user.server"

export type Mentee = Omit<User, "id" | "role"> & {
  id: ReturnType<typeof cuid>
  buddyId: User["id"]
  countryCode: CountryType["code"]
  homeUniversity: string
  hostFaculty: string
  gender: "male" | "female"
  degree: "bachelor" | "master" | "others"
  agreementStartDate: string
  agreementEndDate: string
}

type MenteeItem = {
  pk: `Mentee#${Mentee["id"]}`
  sk: MenteeItem["pk"] | NoteSk
}

type NoteSk = `Note#${Note["id"]}`

const id2pk = (id: Mentee["id"]): MenteeItem["pk"] => `Mentee#${id}`
const id2NoteSk = (id: Note["id"]): NoteSk => `Note#${id}`

type Note = {
  id: ReturnType<typeof cuid>
  content: string
  createdAt: string
  updatedAt: string
}

export async function getMenteeById(id: Mentee["id"]): Promise<Mentee | null> {
  const key = id2pk(id)
  const db = await arc.tables()
  const result = await db.mentees.query({
    KeyConditionExpression: "pk = :pk and sk = :sk",
    ExpressionAttributeValues: {
      ":pk": key,
      ":sk": key,
    },
  })
  const record: Mentee | null = result.Items[0]
  return record
}

export async function getMenteeListItems({
  buddyId,
}: {
  buddyId: Mentee["buddyId"]
}): Promise<Mentee[]> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    IndexName: "menteesByBuddyId",
    KeyConditionExpression: "buddyId = :buddyId",
    ExpressionAttributeValues: { ":buddyId": buddyId },
  })

  return result.Items.map(mentee => ({
    ...mentee,
    fullName: `${mentee.firstName} ${mentee.lastName}`,
  }))
}

export async function createMentee({
  buddyId,
  countryCode,
  email,
  firstName,
  lastName,
  homeUniversity,
  hostFaculty,
  gender,
  degree,
  agreementStartDate,
  agreementEndDate,
}: Omit<Mentee, "id" | "fullName">): Promise<Mentee> {
  const id = cuid()
  const key = id2pk(id)
  const db = await arc.tables()
  await db.mentees.put({
    pk: key,
    sk: key,
    id,
    buddyId,
    countryCode,
    email,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    homeUniversity: homeUniversity.trim(),
    hostFaculty: hostFaculty.trim(),
    gender,
    degree,
    agreementStartDate,
    agreementEndDate,
  })
  const mentee = await getMenteeById(id)
  invariant(mentee, "Mentee not found, something went wrong")
  return mentee
}

export async function deleteMentee(menteeId: Mentee["id"]): Promise<void> {
  const key = id2pk(menteeId)
  const db = await arc.tables()
  const notes = await getNotesOfMentee(menteeId)
  await Promise.all([
    db.mentees.delete({ pk: key, sk: key }),
    ...notes.map(note =>
      db.mentees.delete({ pk: key, sk: id2NoteSk(note.id) }),
    ),
  ])
}

export async function getNotesOfMentee(
  menteeId: Mentee["id"],
): Promise<Note[]> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": id2pk(menteeId),
      ":sk": "Note#",
    },
  })
  return result.Items
}

export async function createNote({
  menteeId,
  content,
}: {
  menteeId: Mentee["id"]
  content: Note["content"]
}): Promise<Note> {
  const id = cuid()
  const db = await arc.tables()
  const result = await db.mentees.put({
    pk: id2pk(menteeId),
    sk: id2NoteSk(id),
    id,
    content,
  })
  return result
}

export async function deleteNote({
  menteeId,
  noteId,
}: {
  menteeId: Mentee["id"]
  noteId: Note["id"]
}): Promise<void> {
  const db = await arc.tables()
  await db.mentees.delete({
    pk: id2pk(menteeId),
    sk: id2NoteSk(noteId),
  })
}
