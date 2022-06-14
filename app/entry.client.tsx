import { RemixBrowser } from "@remix-run/react"
import { hydrate } from "react-dom"

import { CacheProvider, ThemeProvider } from "@emotion/react"
import { StyledEngineProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"

import createEmotionCache from "~/styles/createEmotionCache"
import theme from "~/styles/theme"

const emotionCache = createEmotionCache()

hydrate(
  <CacheProvider value={emotionCache}>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RemixBrowser />
      </ThemeProvider>
    </StyledEngineProvider>
  </CacheProvider>,
  document,
)
