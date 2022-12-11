import arc from "@architect/functions"
import bcrypt from "bcryptjs"
import invariant from "tiny-invariant"
import { getMenteeCount } from "./mentee.server"

export enum Role {
  BUDDY = "0",
  HR = "1",
  PRESIDENT = "2",
  ADMIN = "3",
}

interface Contractor {
  agreementStartDate: string
  agreementEndDate: string
}
export interface User extends Contractor {
  id: `User#${User["email"]}`
  email: string
  firstName: string
  lastName: string
  faculty: string
  role: Role
}
type UserId = User["id"]
type UserEmail = User["email"]
type UnsavedUser = Omit<User, "id">
export type Password = { password: string }

function email2UserId(email: UserEmail): UserId {
  return `User#${email}`
}

export async function getUserListItems(): Promise<User[]> {
  const db = await arc.tables()
  const result = await db.users.scan({})
  return result.Items
}

export async function getUserById(id: UserId): Promise<User | null> {
  const db = await arc.tables()
  const result = await db.users.query({
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": id },
  })
  const record: User | null = result.Items[0]
  return record
}

export async function getUserByEmail(email: UserEmail) {
  const userId = email2UserId(email)
  return getUserById(userId)
}

export async function hasUserWithEmail(email: UserEmail) {
  const user = await getUserByEmail(email)
  return user !== null
}

async function getUserPasswordByEmail(
  email: UserEmail,
): Promise<Password | null> {
  const userId = email2UserId(email)
  const db = await arc.tables()
  const result = await db.passwords.query({
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId },
  })
  const [record] = result.Items
  return record ?? null
}

export async function createUser({
  password,
  email,
  ...userProps
}: UnsavedUser & Password): Promise<User> {
  const userId = email2UserId(email)
  const hashedPassword = await bcrypt.hash(password, 10)
  const db = await arc.tables()
  await db.passwords.put({
    userId,
    password: hashedPassword,
  })
  await db.users.put({
    id: userId,
    email,
    ...userProps,
  })
  const user = await getUserById(userId)
  invariant(user, `User not found after being created. This should not happen`)
  return user
}

export async function updateUser(updatedUser: Omit<User, "id">): Promise<User> {
  const db = await arc.tables()
  return await db.users.put({
    id: email2UserId(updatedUser.email),
    ...updatedUser,
  })
}

export async function deleteUser(id: UserId): Promise<void> {
  const db = await arc.tables()
  await Promise.all([
    db.passwords.delete({ userId: id }),
    db.users.delete({ id }),
  ])
}

export async function deleteUserByEmail(email: UserEmail): Promise<void> {
  const userId = email2UserId(email)
  await deleteUser(userId)
}

export async function verifyLogin(
  email: UserEmail,
  password: Password["password"],
): Promise<User | null> {
  const userPassword = await getUserPasswordByEmail(email)
  if (!userPassword) {
    return null
  }

  const isValid = await bcrypt.compare(password, userPassword.password)
  return isValid ? await getUserByEmail(email) : null
}

export async function getBuddyByEmail(
  email: User["email"],
): Promise<User | null> {
  const buddy = await getUserByEmail(email)
  if (!buddy) {
    return null
  }
  const isBuddyActive = new Date(buddy.agreementEndDate) > new Date()
  return isBuddyActive ? buddy : null
}

// export async function canUserDeleteUser({
//   loggedInUser,
//   userToDelete,
// }: {
//   loggedInUser: User
//   userToDelete: User
// }): Promise<boolean> {
//   const isHigher = loggedInUser.role > userToDelete.role
//   const isNotAdmin = userToDelete.role !== Role.ADMIN
//   const isNotLoggedInUser = loggedInUser.id !== userToDelete.id
//   const hasNoMentees =
//     (await getMenteeCount({ buddyId: userToDelete.id })) === 0

//   return isHigher && isNotAdmin && isNotLoggedInUser && hasNoMentees
// }

export async function canUserDeleteUser({
  loggedInUser,
  userToDelete,
}: {
  loggedInUser: User
  userToDelete: User
}): Promise<{
  canDelete: boolean
  reason: string
}> {
  const isNotLoggedInUser = loggedInUser.id !== userToDelete.id
  if (!isNotLoggedInUser) {
    return {
      canDelete: false,
      reason: "You can not delete yourself",
    }
  }
  const isNotAdmin = userToDelete.role !== Role.ADMIN
  if (!isNotAdmin) {
    return {
      canDelete: false,
      reason: "You can not delete an admin",
    }
  }
  const isHigher = loggedInUser.role > userToDelete.role
  if (!isHigher) {
    return {
      canDelete: false,
      reason: "You can only delete users with a lower role than you",
    }
  }
  const hasNoMentees =
    (await getMenteeCount({ buddyId: userToDelete.id })) === 0
  if (!hasNoMentees) {
    return {
      canDelete: false,
      reason: "You can not delete a user with active mentees",
    }
  }
  return {
    canDelete: true,
    reason: "",
  }
}

export function isUserId(value: any): value is UserId {
  return typeof value === "string" && value.startsWith("User#")
}
