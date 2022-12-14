import type { ChipProps } from "@mui/material"
import Chip from "@mui/material/Chip"

import type { Role } from "~/models/user.server"

export function UserRoleChip({ role }: { role: Role }) {
  const chipColor = {
    3: "warning",
    2: "error",
    1: "info",
    0: "success",
  }[role] as ChipProps["color"]

  const roleLabel = {
    3: "Admin",
    2: "President",
    1: "HR",
    0: "Buddy",
  }[role]

  return (
    <Chip
      size="small"
      label={roleLabel}
      color={chipColor}
      sx={{ textTransform: "uppercase" }}
    />
  )
}
