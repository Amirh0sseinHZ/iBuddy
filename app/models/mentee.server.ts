import arc from "@architect/functions"
import type cuid from "cuid"

import type { CountryType } from "~/utils/country"
import type { User } from "./user.server"

export type Mentee = Omit<User, "role"> & {
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
  sk: MenteeItem["pk"] // will become a union later
}

const id2pk = (id: Mentee["id"]): MenteeItem["pk"] => `Mentee#${id}`

// export async function getMentee({
//   id,
// }: {
//   id: Mentee["id"]
// }): Promise<Mentee | null> {
//   const db = await arc.tables()
//   const key = id2pk(id)
//   const result = await db.mentees.get({ pk: key, sk: key })
//   return result ?? null
// }

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
  return result.Items ?? []
}

// export async function createMentee({
//   buddyId,
//   countryCode,
//   email,
//   firstName,
//   lastName,
//   homeUniversity,
//   hostFaculty,
//   gender,
//   degree,
//   agreementStartDate,
//   agreementEndDate,
//   notes,
// }: Omit<Mentee, "id" | "fullName">): Promise<Mentee> {
//   const db = await arc.tables()

//   const result = await db.mentee.put({
//     pk: buddyId,
//     sk: idToSk(cuid()),
//     buddyId,
//     countryCode,
//     email,
//     firstName: firstName.trim(),
//     lastName: lastName.trim(),
//     homeUniversity: homeUniversity.trim(),
//     hostFaculty: hostFaculty.trim(),
//     gender,
//     degree,
//     agreementStartDate,
//     agreementEndDate,
//     notes,
//   })
//   return {
//     id: skToId(result.sk),
//     buddyId: result.buddyId,
//     countryCode: result.countryCode,
//     email: result.email,
//     firstName: result.firstName,
//     lastName: result.lastName,
//     fullName: `${result.firstName} ${result.lastName}`,
//     homeUniversity: result.homeUniversity,
//     hostFaculty: result.hostFaculty,
//     gender: result.gender,
//     degree: result.degree,
//     agreementStartDate: result.agreementStartDate,
//     agreementEndDate: result.agreementEndDate,
//     notes: result.notes,
//   }
// }

export async function deleteMentee({
  id,
}: {
  id: Mentee["id"]
}): Promise<void> {
  const db = await arc.tables()
  const key = id2pk(id)
  // TODO: delete all related items too (Notes, etc.)
  db.mentees.delete({ pk: key, sk: key })
}
