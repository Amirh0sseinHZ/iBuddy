import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

import { requireUser } from "~/session.server"
import { PagePaper } from "~/components/layout"
import { getUserListItems, Role } from "~/models/user.server"
import { getAllMentees, getMenteeListItems } from "~/models/mentee.server"
import { getAllAssets, getUserAssets } from "~/models/asset.server"
import Grid from "@mui/material/Grid"
import { Typography } from "@mui/material"
import Title from "~/components/dashboard/Title"

type MenteesCount = {
  all: number
  pending: number
  contacted: number
  inTouch: number
  arrived: number
  met: number
  rejected: number
  unresponsive: number
  served: number
  amp: number
}

type AssetsCount = {
  all: number
  images: number
  documents: number
  emailTemplates: number
  shared: number
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)

  const [mentees, assets, allMentees, allAssets, allUsers] = await Promise.all([
    getMenteeListItems({ buddyId: user.id }),
    getUserAssets(user.id),
    user.role === Role.BUDDY ? [] : getAllMentees(),
    user.role === Role.BUDDY ? [] : getAllAssets(),
    user.role === Role.BUDDY ? [] : getUserListItems(),
  ])

  let response: {
    userFirstName: string
    counts: {
      personal: {
        mentees: MenteesCount
        assets: AssetsCount
      }
      all?: {
        mentees: MenteesCount
        assets: AssetsCount
        users: {
          all: number
          buddies: number
          hrs: number
          admins: number
          presidents: number
        }
      }
    }
  } = {
    userFirstName: user.firstName,
    counts: {
      personal: {
        mentees: {
          all: mentees.length,
          pending: mentees.filter(mentee => mentee.status === "assigned")
            .length,
          contacted: mentees.filter(mentee => mentee.status === "contacted")
            .length,
          inTouch: mentees.filter(mentee => mentee.status === "in_touch")
            .length,
          arrived: mentees.filter(mentee => mentee.status === "arrived").length,
          met: mentees.filter(mentee => mentee.status === "met").length,
          rejected: mentees.filter(mentee => mentee.status === "rejected")
            .length,
          unresponsive: mentees.filter(
            mentee => mentee.status === "unresponsive",
          ).length,
          served: mentees.filter(mentee => mentee.status === "served").length,
          amp:
            (mentees.filter(mentee => mentee.status === "arrived").length /
              mentees.filter(mentee => mentee.status !== "rejected").length) *
            100,
        },
        assets: {
          all: assets.length,
          images: assets.filter(asset => asset.type === "image").length,
          documents: assets.filter(asset => asset.type === "document").length,
          emailTemplates: assets.filter(
            asset => asset.type === "email-template",
          ).length,
          shared: assets.filter(asset => asset.sharedUsers.length !== 0).length,
        },
      },
    },
  }
  if (user.role === Role.BUDDY) {
    return json(response)
  }
  response.counts.all = {
    mentees: {
      all: allMentees.length,
      pending: allMentees.filter(mentee => mentee.status === "assigned").length,
      contacted: allMentees.filter(mentee => mentee.status === "contacted")
        .length,
      inTouch: allMentees.filter(mentee => mentee.status === "in_touch").length,
      arrived: allMentees.filter(mentee => mentee.status === "arrived").length,
      met: allMentees.filter(mentee => mentee.status === "met").length,
      rejected: allMentees.filter(mentee => mentee.status === "rejected")
        .length,
      unresponsive: allMentees.filter(
        mentee => mentee.status === "unresponsive",
      ).length,
      served: allMentees.filter(mentee => mentee.status === "served").length,
      amp:
        (allMentees.filter(mentee => mentee.status === "arrived").length /
          allMentees.filter(mentee => mentee.status !== "rejected").length) *
        100,
    },
    assets: {
      all: allAssets.length,
      images: allAssets.filter(asset => asset.type === "image").length,
      documents: allAssets.filter(asset => asset.type === "document").length,
      emailTemplates: allAssets.filter(asset => asset.type === "email-template")
        .length,
      shared: allAssets.filter(asset => asset.sharedUsers.length !== 0).length,
    },
    users: {
      all: allUsers.length,
      buddies: allUsers.filter(user => user.role === Role.BUDDY).length,
      hrs: allUsers.filter(user => user.role === Role.HR).length,
      admins: allUsers.filter(user => user.role === Role.ADMIN).length,
      presidents: allUsers.filter(user => user.role === Role.PRESIDENT).length,
    },
  }
  return json(response)
}

export default function DashboardIndexPage() {
  const { userFirstName, counts } = useLoaderData<typeof loader>()
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          Welcome, {userFirstName}!
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <StatsGroup title="My mentees">
          <StatsBox title="All" value={counts.personal.mentees.all} />
          <StatsBox title="Waiting" value={counts.personal.mentees.pending} />
          <StatsBox
            title="Contacted"
            value={counts.personal.mentees.contacted}
          />
          <StatsBox title="In touch" value={counts.personal.mentees.inTouch} />
          <StatsBox title="Arrived" value={counts.personal.mentees.arrived} />
          <StatsBox title="Met" value={counts.personal.mentees.met} />
          <StatsBox title="Rejected" value={counts.personal.mentees.rejected} />
          <StatsBox
            title="Unresponsive"
            value={counts.personal.mentees.unresponsive}
          />
          <StatsBox title="Served" value={counts.personal.mentees.served} />
          <StatsBox title="AMP" value={counts.personal.mentees.amp} />
        </StatsGroup>
        <StatsGroup title="My assets">
          <StatsBox title="All" value={counts.personal.assets.all} />
          <StatsBox title="Shared" value={counts.personal.assets.shared} />
          <StatsBox title="Images" value={counts.personal.assets.images} />
          <StatsBox
            title="Documents"
            value={counts.personal.assets.documents}
          />
          <StatsBox
            title="Email templates"
            value={counts.personal.assets.emailTemplates}
          />
        </StatsGroup>
        {counts.all && (
          <>
            <StatsGroup title="All users">
              <StatsBox title="Buddies" value={counts.all.users.buddies} />
              <StatsBox title="HRs" value={counts.all.users.hrs} />
              <StatsBox
                title="Presidents"
                value={counts.all.users.presidents}
              />
              <StatsBox title="Admins" value={counts.all.users.admins} />
            </StatsGroup>
            <StatsGroup title="All mentees">
              <StatsBox title="All" value={counts.all.mentees.all} />
              <StatsBox title="Waiting" value={counts.all.mentees.pending} />
              <StatsBox
                title="Contacted"
                value={counts.all.mentees.contacted}
              />
              <StatsBox title="In touch" value={counts.all.mentees.inTouch} />
              <StatsBox title="Arrived" value={counts.all.mentees.arrived} />
              <StatsBox title="Met" value={counts.all.mentees.met} />
              <StatsBox title="Rejected" value={counts.all.mentees.rejected} />
              <StatsBox
                title="Unresponsive"
                value={counts.all.mentees.unresponsive}
              />
              <StatsBox title="Served" value={counts.all.mentees.served} />
              <StatsBox title="AMP" value={counts.all.mentees.amp} />
            </StatsGroup>
            <StatsGroup title="All assets">
              <StatsBox title="All" value={counts.all.assets.all} />
              <StatsBox title="Shared" value={counts.all.assets.shared} />
              <StatsBox title="Images" value={counts.all.assets.images} />
              <StatsBox title="Documents" value={counts.all.assets.documents} />
              <StatsBox
                title="Email templates"
                value={counts.all.assets.emailTemplates}
              />
            </StatsGroup>
          </>
        )}
      </Grid>
    </Grid>
  )
}

function StatsBox({ title, value }: { title: string; value: number }) {
  return (
    <Grid item xs={12} sm={6} md={3} lg={2}>
      <PagePaper sx={{ textAlign: "center" }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="h5">{value}</Typography>
      </PagePaper>
    </Grid>
  )
}

function StatsGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Grid container spacing={1} sx={{ mt: 2 }}>
      <Grid item xs={12}>
        <Title>{title}</Title>
      </Grid>
      {children}
    </Grid>
  )
}
