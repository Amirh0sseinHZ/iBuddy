import arc from "@architect/functions"
import bcrypt from "bcryptjs"
import invariant from "tiny-invariant"

export type User = {
  id: `User#${User["email"]}`
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: "ADMIN" | "PRESIDENT" | "HR" | "BUDDY"
}
type UserId = User["id"]
type UserEmail = User["email"]
type UnsavedUser = Omit<User, "id">
type Password = { password: string }

function email2UserId(email: UserEmail): UserId {
  return `User#${email}`
}

export async function getUserById(id: UserId): Promise<User | null> {
  const db = await arc.tables()
  const result = await db.users.query({
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": id },
  })
  const record: User | null = result.Items[0]

  if (!record) return null

  return {
    ...record,
    fullName: `${record.firstName} ${record.lastName}`,
  }
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
}: UnsavedUser & Password) {
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

export async function deleteUser(id: UserId): Promise<void> {
  const db = await arc.tables()
  await db.passwords.delete({ userId: id })
  await db.users.delete({ id })
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
