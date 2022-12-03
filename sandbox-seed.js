const bcrypt = require("bcryptjs")
const cuid = require("cuid")
const { faker } = require("@faker-js/faker")

const ROLE = {
  BUDDY: "0",
  HR: "1",
  PRESIDENT: "2",
  ADMIN: "3",
}

function buildUser(overrides = {}) {
  const email = overrides.user?.email ?? faker.internet.email()
  const id = `User#${email}`
  const {
    user: userOvrrides,
    password: passwordOverrides,
    mentees: menteesOvrrides,
    ...restOfOverrides
  } = overrides
  return {
    user: {
      id,
      email,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      faculty: faker.company.name(),
      role: faker.helpers.arrayElement(Object.values(ROLE)),
      agreementStartDate: faker.date.recent().toISOString(),
      agreementEndDate: faker.date
        .soon(faker.datatype.number({ min: 10, max: 180 }))
        .toISOString(),
      ...userOvrrides,
    },
    password: {
      userId: id,
      password: bcrypt.hashSync(faker.internet.password(), 10),
      ...passwordOverrides,
    },
    mentees: Array.from(
      { length: faker.datatype.number({ min: 0, max: 12 }) },
      () =>
        buildMentee({
          buddyId: id,
          ...menteesOvrrides,
        }),
    ).flat(),
    ...restOfOverrides,
  }
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
    buddyId: cuid(),
    countryCode: faker.address.countryCode(),
    homeUniversity: faker.company.name(),
    hostFaculty: faker.company.name(),
    degree: faker.helpers.arrayElement(["bachelor", "master", "others"]),
    agreementStartDate: faker.date.recent().toISOString(),
    agreementEndDate: faker.date
      .soon(faker.datatype.number({ min: 150, max: 180 }))
      .toISOString(),
    ...overrides,
  }

  const notes = Array.from(
    { length: faker.datatype.number({ min: 0, max: 3 }) },
    () =>
      buildNote({
        pk: key,
        authorId: mentee.buddyId,
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
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  }
}

const adminUser = {
  ...buildUser({
    user: { email: "admin@example.com", role: ROLE.ADMIN },
    password: { password: bcrypt.hashSync("password", 10) },
  }),
}
const presidentUser = buildUser({
  user: { role: ROLE.PRESIDENT },
})
const hrUsers = Array.from({ length: 3 }, () =>
  buildUser({ user: { role: ROLE.HR } }),
)
const buddyUsers = Array.from({ length: 10 }, () =>
  buildUser({ user: { role: ROLE.BUDDY } }),
)

let users = [adminUser, presidentUser, ...hrUsers, ...buddyUsers]
const passwords = users.map(u => u.password)
const mentees = users.map(u => u.mentees).flat()
users = users.map(u => u.user)

const seed = {
  users,
  passwords,
  mentees,
}
module.exports = seed
