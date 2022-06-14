import type { EntryContext } from "@remix-run/node"
import { RemixServer } from "@remix-run/react"
import { renderToString } from "react-dom/server"

import CssBaseline from "@mui/material/CssBaseline"
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles"
import { CacheProvider } from "@emotion/react"
import createEmotionServer from "@emotion/server/create-instance"

import createEmotionCache from "~/styles/createEmotionCache"
import StylesContext from "~/styles/StylesContext"
import theme from "~/styles/theme"

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const cache = createEmotionCache()
  const { extractCriticalToChunks } = createEmotionServer(cache)

  const MuiRemixServer = () => (
    <CacheProvider value={cache}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RemixServer context={remixContext} url={request.url} />
        </ThemeProvider>
      </StyledEngineProvider>
    </CacheProvider>
  )

  // Render the component to a string.
  const html = renderToString(
    <StylesContext.Provider value={null}>
      <MuiRemixServer />
    </StylesContext.Provider>,
  )

  // Grab the CSS from emotion
  const emotionChunks = extractCriticalToChunks(html)

  // Re-render including the extracted css.
  const markup = renderToString(
    <StylesContext.Provider value={emotionChunks.styles}>
      <MuiRemixServer />
    </StylesContext.Provider>,
  )

  responseHeaders.set("Content-Type", "text/html")

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
