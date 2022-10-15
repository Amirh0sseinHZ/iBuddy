const bcrypt = require("bcryptjs")

const testUser = {
  pk: "email#test@test.com",
  id: "email#test@test.com",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
}

const testUserPassword = {
  pk: testUser.pk,
  password: bcrypt.hashSync("test", 10),
}

module.exports = {
  user: [testUser],
  password: [testUserPassword],
}
