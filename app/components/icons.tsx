import { mdiGenderFemale, mdiGenderMale } from "@mdi/js"
import { Icon } from "@mdi/react"

export function GenderIcon({ gender }: { gender: "male" | "female" }) {
  return (
    <Icon
      path={gender === "male" ? mdiGenderMale : mdiGenderFemale}
      color={gender === "male" ? "#5CC4F3" : "#F576AC"}
      size={1}
      title={gender}
    />
  )
}
