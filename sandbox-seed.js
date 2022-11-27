const bcrypt = require("bcryptjs")
const cuid = require("cuid")
const { faker } = require("@faker-js/faker")

const credentials = {
  email: "test@test.com",
  password: "test",
}
const userId = `User#${credentials.email}`
const testUser = {
  user: {
    id: userId,
    email: credentials.email,
    firstName: "Test",
    lastName: "User",
    faculty: "Test Faculty",
    role: "3", // "3" === admin
    agreementStartDate: faker.date.recent().toISOString(),
    agreementEndDate: faker.date.soon(180).toISOString(),
  },
  password: {
    userId,
    password: bcrypt.hashSync(credentials.password, 10),
  },
  mentees: Array.from({ length: 10 }, () => buildMentee()).flat(),
}

function buildMentee(overrides = {}) {
  const id = cuid()
  const key = `Mentee#${id}`
  const gender = faker.name.sex()
  const firstName = faker.name.firstName(gender)
  const lastName = faker.name.lastName(gender)

  const mentee = {
    pk: key,
    sk: key,
    id,
    firstName,
    lastName,
    gender,
    email: faker.internet.email(firstName, lastName),
    buddyId: userId,
    countryCode: faker.address.countryCode(),
    homeUniversity: faker.company.name(),
    hostFaculty: faker.company.name(),
    degree: faker.helpers.arrayElement(["bachelor", "master", "others"]),
    ...overrides,
  }

  const notes = Array.from(
    { length: faker.datatype.number({ min: 0, max: 3 }) },
    () =>
      buildNote({
        pk: key,
        authorId: userId,
      }),
  )

  return [mentee, ...notes]
}

function buildNote(overrides = {}) {
  const id = cuid()
  const key = `Note#${id}`

  return {
    sk: key,
    id,
    content: faker.lorem.paragraphs(3),
    ...overrides,
  }
}

const seed = {
  users: [testUser.user],
  passwords: [testUser.password],
  mentees: [...testUser.mentees],
}
module.exports = seed
