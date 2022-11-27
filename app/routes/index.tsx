import type { LoaderFunction } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import { Copyright } from "~/components/coypright"
import { getUserId } from "~/session.server"

export const loader: LoaderFunction = async ({ request }) => {
  const userID = await getUserId(request)
  if (userID) {
    return redirect("/dashboard")
  }
  return {}
}

export default function Index() {
  return (
    <Grid container component="main" sx={{ height: "100vh" }}>
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1567023249914-7c83f04de30c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)",
          backgroundRepeat: "no-repeat",
          backgroundColor: t =>
            t.palette.mode === "light"
              ? t.palette.grey[50]
              : t.palette.grey[900],
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography component="h1" variant="h5">
            Heya!
          </Typography>
          <Box sx={{ mt: 2 }}>
            <form action="/auth/signin">
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mb: 2 }}
              >
                Sign In
              </Button>
            </form>
            <Copyright sx={{ mt: 2 }} />
          </Box>
        </Box>
      </Grid>
    </Grid>
  )
}
