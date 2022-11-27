import { faker } from "@faker-js/faker"
import type { Password, User } from "~/models/user.server"

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Logs in with a random user. Yields the user and adds an alias to the user
       *
       * @returns {typeof login}
       * @memberof Chainable
       * @example
       *    cy.login()
       * @example
       *    cy.login({ email: 'whatever@example.com' })
       */
      login: typeof login

      /**
       * Inserts a user into the database. Yields the user and adds an alias to the user
       * @returns {typeof insertUser}
       * @memberof Chainable
       * @example
       *   cy.insertUser()
       * @example
       *   cy.insertUser({ email: 'test@test.com', password: 'myreallystrongpassword' })
       */
      insertUser: typeof insertUser
    }
  }
}

function insertUser({
  email = faker.internet.email(undefined, undefined, "example.com"),
  password = faker.internet.password(),
}: {
  email?: User["email"]
  password?: Password["password"]
} = {}) {
  cy.then(() => ({ email, password })).as("user")
  cy.request("POST", "/__tests/insert-user", { email, password })
  return cy.get("@user")
}

function login({
  email = faker.internet.email(undefined, undefined, "example.com"),
}: {
  email?: User["email"]
} = {}) {
  cy.then(() => ({ email })).as("user")
  cy.request("POST", "/__tests/create-user", { email })
  return cy.get("@user")
}

Cypress.Commands.add("login", login)
Cypress.Commands.add("insertUser", insertUser)
