import type { PaperProps } from "@mui/material/Paper"
import MuiPaper from "@mui/material/Paper"

export function PagePaper(props: PaperProps) {
  return <MuiPaper sx={{ width: "100%", px: 3, py: 2 }} {...props} />
}
