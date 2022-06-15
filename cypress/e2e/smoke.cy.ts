import { faker } from "@faker-js/faker"

describe("smoke tests", () => {
  it("should allow you to register and login", () => {
    const loginForm = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
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
    cy.findByRole("link", { name: /sign up/i }).click()

    cy.findByRole("textbox", { name: /first name/i }).type(loginForm.firstName)
    cy.findByRole("textbox", { name: /last name/i }).type(loginForm.lastName)
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email)
    cy.findByLabelText(/password/i).type(loginForm.password)
    cy.findByRole("button", { name: /sign up/i }).click()

    cy.findByRole("link", { name: /notes/i, timeout: 10000 }).click()
    cy.findByRole("button", { name: /logout/i }).click()
    cy.findByRole("link", { name: /log in/i })
  })

  it("should allow you to make a note", () => {
    const testNote = {
      title: faker.lorem.words(1),
      body: faker.lorem.sentences(1),
    }
    cy.login()
    cy.visit("/")

    cy.findByRole("link", { name: /notes/i }).click()
    cy.findByText("No notes yet")

    cy.findByRole("link", { name: /\+ new note/i }).click()

    cy.findByRole("textbox", { name: /title/i }).type(testNote.title)
    cy.findByRole("textbox", { name: /body/i }).type(testNote.body)
    cy.findByRole("button", { name: /save/i }).click()

    cy.findByRole("button", { name: /delete/i, timeout: 10000 }).click()
    cy.wait(500)
    cy.findByText("No notes yet")
  })
})
