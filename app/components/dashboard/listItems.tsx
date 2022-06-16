import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@mui/material"
import { mdiViewDashboard, mdiAccountPlus, mdiAccountGroup } from "@mdi/js"
import Icon from "@mdi/react"
import { PendingLink } from "../link"

export const mainListItems = (
  <>
    <PendingLink to="/dashboard">
      <ListItemButton>
        <ListItemIcon>
          <Icon path={mdiViewDashboard} size={1} />
        </ListItemIcon>
        <ListItemText color="text.primary" primary="Dashboard" />
      </ListItemButton>
    </PendingLink>
  </>
)

export const secondaryListItems = (
  <>
    <ListSubheader component="div" inset>
      Mentee management
    </ListSubheader>
    <PendingLink to="/dashboard/mentees">
      <ListItemButton>
        <ListItemIcon>
          <Icon path={mdiAccountGroup} size={1} />
        </ListItemIcon>
        <ListItemText primary="Mentees" />
      </ListItemButton>
    </PendingLink>
    <PendingLink to="/dashboard/mentees/new">
      <ListItemButton>
        <ListItemIcon>
          <Icon path={mdiAccountPlus} size={1} />
        </ListItemIcon>
        <ListItemText primary="New mentee" />
      </ListItemButton>
    </PendingLink>
  </>
)
