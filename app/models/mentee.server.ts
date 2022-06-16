import arc from "@architect/functions"
import cuid from "cuid"
import type { CountryType } from "~/utils/country"

import type { User } from "./user.server"

export type Mentee = {
  id: ReturnType<typeof cuid>
  buddyId: User["id"]
  countryCode: CountryType["code"]
  homeUniversity: string
  hostFaculty: string
  gender: "male" | "female"
  degree: "bachelor" | "master" | "others"
  agreementStartDate: string
  agreementEndDate: string
  notes?: string
} & Omit<User, "id">

type MenteeItem = {
  pk: User["id"]
  sk: `mentee#${Mentee["id"]}`
}

const skToId = (sk: MenteeItem["sk"]): Mentee["id"] =>
  sk.replace(/^mentee#/, "")
const idToSk = (id: Mentee["id"]): MenteeItem["sk"] => `mentee#${id}`

export async function getMentee({
  id,
  buddyId,
}: Pick<Mentee, "id" | "buddyId">): Promise<Mentee | null> {
  const db = await arc.tables()

  const result = await await db.mentee.get({ pk: buddyId, sk: idToSk(id) })

  if (result)
    return {
      id: result.pk,
      buddyId: result.buddyId,
      countryCode: result.countryCode,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      fullName: `${result.firstName} ${result.lastName}`,
      homeUniversity: result.homeUniversity,
      hostFaculty: result.hostFaculty,
      gender: result.gender,
      degree: result.degree,
      agreementStartDate: result.agreementStartDate,
      agreementEndDate: result.agreementEndDate,
      notes: result.notes,
    }
  return null
}

export async function getMenteeListItems({
  buddyId,
}: Pick<Mentee, "buddyId">): Promise<Mentee[]> {
  const db = await arc.tables()

  const result = await db.mentee.query({
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": buddyId },
  })

  return result.Items.map((n: any) => ({
    id: skToId(n.sk),
    buddyId: n.buddyId,
    countryCode: n.countryCode,
    email: n.email,
    firstName: n.firstName,
    lastName: n.lastName,
    fullName: `${n.firstName} ${n.lastName}`,
    homeUniversity: n.homeUniversity,
    hostFaculty: n.hostFaculty,
    gender: n.gender,
    degree: n.degree,
    agreementStartDate: n.agreementStartDate,
    agreementEndDate: n.agreementEndDate,
    notes: n.notes,
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
  notes,
}: Omit<Mentee, "id" | "fullName">): Promise<Mentee> {
  const db = await arc.tables()

  const result = await db.mentee.put({
    pk: buddyId,
    sk: idToSk(cuid()),
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
    notes,
  })
  return {
    id: skToId(result.sk),
    buddyId: result.buddyId,
    countryCode: result.countryCode,
    email: result.email,
    firstName: result.firstName,
    lastName: result.lastName,
    fullName: `${result.firstName} ${result.lastName}`,
    homeUniversity: result.homeUniversity,
    hostFaculty: result.hostFaculty,
    gender: result.gender,
    degree: result.degree,
    agreementStartDate: result.agreementStartDate,
    agreementEndDate: result.agreementEndDate,
    notes: result.notes,
  }
}

export async function deleteMentee({
  id,
  buddyId,
}: Pick<Mentee, "id" | "buddyId">) {
  const db = await arc.tables()
  return db.note.delete({ pk: buddyId, sk: idToSk(id) })
}
