import type { ZodError, ZodSchema } from "zod"
import * as z from "zod"
import isAlpha from "validator/lib/isAlpha"
import isStrongPassword from "validator/lib/isStrongPassword"
import isDate from "validator/lib/isDate"
import { countries } from "./country"

type ActionErrors<T> = Partial<Record<keyof T, string>>

export async function validateAction<ActionInput>({
  request,
  schema,
}: {
  request: Request
  schema: ZodSchema
}) {
  const body = Object.fromEntries(await request.formData())

  try {
    const formData = schema.parse(body) as ActionInput

    return { formData, errors: null }
  } catch (e) {
    const errors = e as ZodError<ActionInput>

    return {
      formData: body,
      errors: errors.issues.reduce((acc: ActionErrors<ActionInput>, curr) => {
        const key = curr.path[0] as keyof ActionInput
        if (!acc[key]) {
          acc[key] = curr.message
        }
        return acc
      }, {}),
    }
  }
}

type FieldName = string

export const Zod = {
  name: (fieldName: FieldName = "Name") =>
    z
      .string({ required_error: getRequiredError(fieldName) })
      .trim()
      .min(2, `${fieldName} is too short`)
      .max(255, getTooLongError(fieldName))
      .refine(
        str => isAlpha(str, "en-US", { ignore: " " }),
        `${fieldName} must contain only English letters and spaces`,
      ),

  email: (fieldName: FieldName = "Email") =>
    z
      .string({ required_error: getRequiredError(fieldName) })
      .min(1, getRequiredError(fieldName))
      .email(`${fieldName} is not a valid email address`),

  strongPassword: (fieldName: FieldName = "Password") =>
    z
      .string({
        required_error: getRequiredError(fieldName),
      })
      .max(64, getTooLongError(fieldName))
      .refine(
        str =>
          isStrongPassword(str, {
            minLength: 8,
            minNumbers: 1,
            minLowercase: 1,
            minUppercase: 1,
            minSymbols: 1,
          }),
        `${fieldName} is too weak, it should be at least 8 characters long, contain numbers, lowercase letters, uppercase letters, and symbols`,
      ),

  requiredString: (fieldName: FieldName = "Field") => {
    const requiredMsg = getRequiredError(fieldName)
    return z.string({ required_error: requiredMsg }).trim().min(1, requiredMsg)
  },

  dateString: (fieldName: FieldName = "Date") =>
    z
      .string({ required_error: getRequiredError(fieldName) })
      .trim()
      .min(1, getRequiredError(fieldName))
      .refine(isDate, `${fieldName} is not a valid date`),

  country: (fieldName: FieldName = "Country") =>
    z
      .string()
      .trim()
      .min(1, getRequiredError(fieldName))
      .refine(isCountry, `${fieldName} is not a valid country`),
}

function getRequiredError(fieldName: FieldName) {
  return `${fieldName} is required`
}

function getTooLongError(fieldName: FieldName) {
  return `${fieldName} is too long`
}

const countryNames = countries.map(country => country.label)

function isCountry(str: string): boolean {
  return countryNames.includes(str)
}
