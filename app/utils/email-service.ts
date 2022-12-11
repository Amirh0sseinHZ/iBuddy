import type { Mentee } from "./../models/mentee.server"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import invariant from "tiny-invariant"

const { AWS_REGION, SES_EMAIL_SOURCE } = process.env
invariant(AWS_REGION, "AWS_REGION is required")
invariant(SES_EMAIL_SOURCE, "SES_EMAIL_SOURCE is required")

const client = new SESClient({ region: AWS_REGION })

type EmailAddress = string | string[]

type SendEmailParams = {
  to: EmailAddress
  cc?: EmailAddress
  htmlBody: string
  subject: string
  senderName: string
}

export async function sendEmail({
  to,
  cc = [],
  htmlBody,
  subject,
  senderName,
}: SendEmailParams) {
  const sendEmailCommand = new SendEmailCommand({
    Destination: {
      CcAddresses: Array.isArray(cc) ? cc : [cc],
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody,
        },
        // Text: {
        //   Charset: "UTF-8",
        //   Data: "TEXT_FORMAT_BODY",
        // },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: `=?UTF-8?B?${Buffer.from(senderName).toString(
      "base64",
    )}?= <${SES_EMAIL_SOURCE}>`,
  })
  return await client.send(sendEmailCommand)
}

export const ALLOWED_VARIABLES: Array<keyof Mentee> = [
  "firstName",
  "lastName",
  "email",
  "gender",
  "degree",
]

export function resolveBody({
  body,
  recipient,
}: {
  body: string
  recipient: Mentee
}) {
  return ALLOWED_VARIABLES.reduce((acc, key) => {
    const searchValue = `{{${key}}}`
    const replaceValue = recipient[key]
    return acc.replaceAll(searchValue, replaceValue)
  }, body)
}

export function areAllowedVariables(
  some: string[],
): some is typeof ALLOWED_VARIABLES {
  return some.every(key => {
    const keyWithoutMustaches = key.slice(2, -2)
    return ALLOWED_VARIABLES.includes(keyWithoutMustaches as any)
  })
}
