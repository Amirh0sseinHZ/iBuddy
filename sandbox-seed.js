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
    role: "HR",
  },
  password: {
    userId,
    password: bcrypt.hashSync(credentials.password, 10),
  },
  mentees: Array.from({ length: 25 }, () => buildMentee()),
}

module.exports = {
  users: [testUser.user],
  passwords: [testUser.password],
  mentees: [...testUser.mentees],
}

function buildMentee(overrides = {}) {
  const id = cuid()
  const key = `Mentee#${id}`
  const gender = faker.name.sex()
  const firstName = faker.name.firstName(gender)
  const lastName = faker.name.lastName(gender)
  return {
    pk: key,
    sk: key,
    id,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    email: faker.internet.email(firstName, lastName),
    buddyId: userId,
    countryCode: faker.address.countryCode(),
    homeUniversity: faker.company.name(),
    hostFaculty: faker.company.name(),
    degree: faker.helpers.arrayElement(["bachelor", "master", "others"]),
    ...overrides,
  }
}
