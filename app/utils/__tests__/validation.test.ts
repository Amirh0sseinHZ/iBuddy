import { Zod } from "../validation"

describe("Validation Utils", () => {
  test("strongPassword rejects weak passwords", () => {
    const password = "1234567"
    expect(() => Zod.strongPassword(password).parse(password)).toThrowError(
      /weak/i,
    )
  })

  test("strongPassword accepts strong passwords", () => {
    const password = "Ab1234567890!@#$%^&*()_+"
    expect(() => Zod.strongPassword(password).parse(password)).not.toThrow()
  })

  test("name rejects non-names", () => {
    ;["", "1", "a", "A", "a1", "A1", " ", "  a", "a.c"].forEach(name => {
      expect(() => Zod.name().parse(name)).toThrowError()
    })
  })

  test("name accepts proper names", () => {
    ;["Lu", "Sara", "Mike Doe", "Karen Smith White"].forEach(name => {
      expect(() => Zod.name().parse(name)).not.toThrow()
    })
  })
})
