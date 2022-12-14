describe("smoke tests", () => {
  it("should allow you to login and logout", () => {
    cy.insertUser().then(user => {
      cy.visit("/")
      cy.findByRole("link", { name: /sign in/i }).click()

      cy.findByRole("textbox", { name: /email/i, timeout: 20000 }).type(
        // @ts-ignore
        user.email,
      )
      //@ts-ignore
      cy.findByLabelText(/password/i).type(user.password)
      cy.findByRole("button", { name: /sign in/i }).click()

      cy.findByRole("user-avatar", { timeout: 20000 }).click()
      cy.findByRole("button", { name: /sign out/i }).click()
      cy.findByRole("link", { name: /sign in/i })
    })
  })
})
