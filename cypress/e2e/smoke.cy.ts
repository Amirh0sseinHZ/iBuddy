import { faker } from "@faker-js/faker"

describe("smoke tests", () => {
  it("should allow you to register and login", () => {
    const loginForm = {
      firstName: faker.name.firstName().replace(/[^\w\s]/gi, ""),
      lastName: faker.name.lastName().replace(/[^\w\s]/gi, ""),
      email: `${faker.internet.userName()}@example.com`,
      password: faker.internet.password(
        undefined,
        undefined,
        undefined,
        "A0b#_",
      ),
    }
    cy.then(() => ({ email: loginForm.email })).as("user")

    cy.visit("/")
    cy.findByRole("button", { name: /sign up/i }).click()

    cy.findByRole("textbox", { name: /first name/i }).type(loginForm.firstName)
    cy.findByRole("textbox", { name: /last name/i }).type(loginForm.lastName)
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email)
    cy.findByLabelText(/password/i).type(loginForm.password)
    cy.findByRole("button", { name: /sign up/i }).click()

    cy.findByRole("link", { name: /new/i, timeout: 10000 }).click()
    cy.findByRole("user-avatar").click()
    cy.findByRole("button", { name: /sign out/i }).click()
    cy.findByRole("button", { name: /sign in/i })
  })
})
