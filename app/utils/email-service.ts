import type { Mentee } from "./../models/mentee.server"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import invariant from "tiny-invariant"
import type { User } from "~/models/user.server"

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
  replyTo: EmailAddress
}

export async function sendEmail({
  to,
  cc = [],
  htmlBody,
  subject,
  senderName,
  replyTo,
}: SendEmailParams) {
  const sendEmailCommand = new SendEmailCommand({
    Destination: {
      CcAddresses: Array.isArray(cc) ? cc : [cc],
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    ReplyToAddresses: Array.isArray(replyTo) ? replyTo : [replyTo],
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

export const ALLOWED_EMAIL_VARIABLES: Partial<Record<keyof Mentee, string>> = {
  firstName: "Mentee's first name",
  lastName: "Mentee's last name",
  email: "Mentee's email",
  gender: "Mentee's gender",
  degree: "Mentee's degree",
}

const ALLOWED_EMAIL_VARIABLES_KEYS = Object.keys(
  ALLOWED_EMAIL_VARIABLES,
) as Array<keyof Mentee>

export function resolveBody({
  body,
  recipient,
}: {
  body: string
  recipient: Mentee
}) {
  return ALLOWED_EMAIL_VARIABLES_KEYS.reduce((acc, key) => {
    const searchValue = `{{${key}}}`
    const replaceValue = recipient[key]
    return acc.replaceAll(searchValue, replaceValue)
  }, body)
}

export function areAllowedVariables(
  some: string[],
): some is typeof ALLOWED_EMAIL_VARIABLES_KEYS {
  return some.every(key => {
    const keyWithoutMustaches = key.slice(2, -2)
    return ALLOWED_EMAIL_VARIABLES_KEYS.includes(keyWithoutMustaches as any)
  })
}

export function sendWelcomeEmail({
  user,
  password,
}: {
  user: User
  password: string
}) {
  const subject = "Welcome to iBuddy - Here's your login details"
  const htmlBody = `<html>
  <head>
    <style>
      body {
        font-family: sans-serif;
        font-size: 14px;
      }
      p {
        margin-bottom: 10px;
      }
      ul {
        margin-top: 0;
        margin-bottom: 10px;
      }
      li {
        list-style-type: none;
      }
      .bold {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <p>
      Dear ${user.firstName},
    </p>
    <p>
      Welcome to iBuddy! We are excited to have you as a member of our community.
    </p>
    <p>
      Your login credentials are as follows:
    </p>
    <ul>
      <li>Username: <span class="bold">${user.email}</span></li>
      <li>Password: <span class="bold">${password}</span></li>
    </ul>
    <p>
      Please keep these credentials safe and do not share them with anyone.
    </p>
    <p>
      Thank you for joining us. We look forward to your contributions to our community.
    </p>
    <p>
      Sincerely,<br>
      <span class="bold">iBuddy</span>
    </p>
  </body>
  </html>
  `

  return sendEmail({
    to: user.email,
    subject,
    htmlBody,
    senderName: "iBuddy",
    replyTo: "no-reply@ibbudy.com",
  })
}
