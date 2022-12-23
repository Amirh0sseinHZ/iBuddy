import arc from "@architect/functions"
import cuid from "cuid"
import type { User } from "./user.server"
import { Role } from "./user.server"

export type FAQ = {
  id: ReturnType<typeof cuid>
  authorId: User["id"]
  question: string
  answer: string
  createdAt: string
  updatedAt?: string
}

type NewFAQPayload = Omit<FAQ, "id" | "createdAt" | "updatedAt">
type UpdateFAQPayload = Omit<FAQ, "id" | "createdAt" | "updatedAt" | "authorId">

export async function getAllFAQs(): Promise<FAQ[]> {
  const db = await arc.tables()
  const result = await db.faqs.scan({})
  return result.Items
}

export async function getFAQById(id: FAQ["id"]): Promise<FAQ> {
  const db = await arc.tables()
  return await db.faqs.get({ id })
}

export async function deleteFAQ(id: FAQ["id"]): Promise<void> {
  const db = await arc.tables()
  await db.faqs.delete({ id })
}

export async function updateFAQ(
  id: FAQ["id"],
  { question, answer }: UpdateFAQPayload,
): Promise<void> {
  const db = await arc.tables()
  await db.faqs.update({
    Key: { id },
    UpdateExpression:
      "set question = :question, answer = :answer, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":question": question,
      ":answer": answer,
      ":updatedAt": new Date().toISOString(),
    },
  })
}

export async function createFAQ({
  question,
  answer,
  authorId,
}: NewFAQPayload): Promise<FAQ> {
  const db = await arc.tables()
  const newFAQ: FAQ = {
    id: cuid(),
    question,
    answer,
    authorId,
    createdAt: new Date().toISOString(),
  }
  return await db.faqs.put(newFAQ)
}

export function canUserMutateFAQ(user: User, faq: FAQ) {
  return user.id === faq.authorId || user.role !== Role.BUDDY
}

export function canUserCreateFAQ(user: User) {
  return user.role !== Role.BUDDY
}
