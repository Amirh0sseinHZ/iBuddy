import type { ActionFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import faker from "@faker-js/faker"

import { createMentee } from "~/models/mentee.server"

export const action: ActionFunction = async ({ request }) => {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 test routes should not be enabled in production 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨",
    )
    // test routes should not be enabled in production or without
    // enable test routes... Just in case this somehow slips through
    // we'll redirect :)
    return redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  }

  const { buddyId } = await request.json()
  if (!buddyId) {
    throw new Error("buddyId required")
  }

  const getRandomMaleOrFemale = (): "male" | "female" => {
    return Math.random() > 0.5 ? "male" : "female"
  }

  const getRandomDegree = (): "bachelor" | "master" | "others" => {
    return "bachelor"
  }

  const mentees = []
  for (let i = 0; i < 10; i++) {
    mentees.push({
      buddyId,
      countryCode: faker.address.countryCode(),
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      homeUniversity: faker.company.companyName(),
      hostFaculty: faker.company.companyName(),
      gender: getRandomMaleOrFemale(),
      degree: getRandomDegree(),
      agreementStartDate: "2022-01-01",
      agreementEndDate: "2023-01-01",
      notes: faker.lorem.paragraph(3),
    })
  }
  return Promise.all(mentees.map(async mentee => createMentee(mentee)))
}

export default null
