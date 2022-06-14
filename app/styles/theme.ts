import { createTheme } from "@mui/material/styles"
import { red } from "@mui/material/colors"

const theme = createTheme({
  palette: {
    primary: {
      main: "#1B74E8",
    },
    error: {
      main: red.A400,
    },
  },
})

export default theme
