import { Typography, Link } from "@mui/material"

export function Copyright(props: any) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit">iBuddy</Link> {new Date().getFullYear()}
      {"."}
    </Typography>
  )
}
