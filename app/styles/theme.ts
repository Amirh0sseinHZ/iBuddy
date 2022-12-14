import { createTheme } from "@mui/material/styles"
import { red } from "@mui/material/colors"

const themeConfig = {
  palette: {
    primary: {
      main: "#78003F",
    },
    error: {
      main: red.A400,
    },
  },
}

const theme = createTheme(themeConfig)

export default theme
