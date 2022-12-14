import * as React from "react"
import {
  useLoaderData,
  Form,
  useTransition,
  Link as RemixLink,
} from "@remix-run/react"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/server-runtime"
import { redirect, json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import {
  Box,
  Grid,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material"
import Icon from "@mdi/react"
import {
  mdiCheck,
  mdiClose,
  mdiPencilOutline,
  mdiTrashCanOutline,
} from "@mdi/js"

import type { Note } from "~/models/mentee.server"
import { getMenteeById } from "~/models/mentee.server"
import { getNote } from "~/models/mentee.server"
import { canUserMutateMentee } from "~/models/mentee.server"
import { canUserMutateNote } from "~/models/mentee.server"
import {
  createNote,
  deleteMentee,
  deleteNote,
  getNotesOfMentee,
  updateNote,
} from "~/models/mentee.server"
import { getUserById } from "~/models/user.server"
import { requireUser } from "~/session.server"
import { PendingMuiLink } from "~/components/link"
import {
  getHumanReadableDegree,
  getHumanReadableMenteeStatus,
} from "~/utils/common"
import { GenderIcon } from "~/components/icons"
import { PagePaper } from "~/components/layout"
import { BackgroundLetterAvatars } from "~/components/avatar"
import { getCountryFromCode } from "~/utils/country"

export const meta: MetaFunction = ({ data }) => {
  const { mentee } = data as SerializeFrom<typeof loader>
  const menteeFullName = `${mentee.firstName} ${mentee.lastName}`
  return {
    title: `${menteeFullName} - iBuddy`,
  }
}

export async function loader({ params, request }: LoaderArgs) {
  const user = await requireUser(request)
  const { menteeId } = params
  invariant(menteeId, "menteeId is required")
  const [mentee, notes] = await Promise.all([
    getMenteeById(menteeId),
    getNotesOfMentee(menteeId),
  ])
  invariant(mentee, "Mentee not found")
  const buddy = await getUserById(mentee.buddyId)
  invariant(buddy, "Buddy not found")
  const uniqueAuthorIds = new Set(notes.map(note => note.authorId))
  const authors = await Promise.all(
    Array.from(uniqueAuthorIds).map(id => getUserById(id)),
  )
  const notesWithAuthorsAndPermissions = notes.map(note => {
    const { authorId, ...restOfNote } = note
    const author = authors.find(author => author?.id === authorId)
    invariant(author, "Author not found")
    const canBeMutated = canUserMutateNote(user, note)
    return { ...restOfNote, author, canBeMutated }
  })
  const sortedNotes = notesWithAuthorsAndPermissions.sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1,
  )
  return json({
    notes: sortedNotes,
    canMutateMentee: canUserMutateMentee(user),
    mentee: {
      ...mentee,
      buddy,
    },
  })
}

export async function action({ request, params }: ActionArgs) {
  const user = await requireUser(request)
  const {
    id: noteId,
    content,
    _action,
  } = Object.fromEntries(await request.formData())
  const { menteeId } = params

  if (_action === "create_note") {
    invariant(typeof content === "string", "Form submitted incorrectly")
    invariant(menteeId, "menteeId is required")
    invariant(content, "content is required")
    await createNote({ menteeId, content, authorId: user.id })
    return null
  }
  if (_action === "update_note") {
    invariant(
      typeof menteeId === "string" &&
        typeof content === "string" &&
        typeof noteId === "string",

      "Form submitted incorrectly",
    )
    const note = await getNote({
      menteeId,
      noteId,
    })
    invariant(note, "Note not found")
    invariant(canUserMutateNote(user, note), "Not allowed to mutate note")
    await updateNote({
      noteId,
      content,
      menteeId,
    })
    return null
  }
  if (_action === "delete_note") {
    invariant(
      typeof menteeId === "string" && typeof noteId === "string",
      "Form submitted incorrectly",
    )
    const note = await getNote({
      menteeId,
      noteId,
    })
    invariant(note, "Note not found")
    invariant(canUserMutateNote(user, note), "Not allowed to delete note")
    await deleteNote({ menteeId, noteId })
    return null
  }
  if (_action === "delete_mentee") {
    invariant(menteeId, "menteeId is required")
    invariant(canUserMutateMentee(user), "Not allowed to delete mentee")
    await deleteMentee(menteeId)
    return redirect("/dashboard/mentees")
  }
  throw new Error(`Unknown action: ${_action}`)
}

export default function MenteePage() {
  const { notes, canMutateMentee, mentee } = useLoaderData<typeof loader>()
  const transition = useTransition()
  const [editingId, setEditingId] = React.useState<Note["id"] | null>(null)

  const formRef = React.useRef<HTMLFormElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const isAddingNote =
    transition.state === "submitting" &&
    transition.submission?.formData.get("_action") === "create_note"

  React.useEffect(() => {
    if (!isAddingNote) {
      formRef.current?.reset()
      textareaRef.current?.focus()
    }
  }, [isAddingNote])

  const isUpdatingNote =
    transition.state === "submitting" &&
    transition.submission?.formData.get("_action") === "update_note"

  React.useEffect(() => {
    if (!isUpdatingNote) {
      setEditingId(null)
    }
  }, [isUpdatingNote])

  const isDeletingNote =
    transition.state === "submitting" &&
    transition.submission?.formData.get("_action") === "delete_note"

  const isDeletingMentee =
    transition.state === "submitting" &&
    transition.submission?.formData.get("_action") === "delete_mentee"

  return (
    <Grid container spacing={2}>
      <Grid
        item
        xs={12}
        container
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid item xs={9}>
          <Typography
            component="h1"
            variant="h4"
            sx={{ color: "#505050", fontWeight: 600 }}
          >
            {mentee.firstName} {mentee.lastName}
          </Typography>
        </Grid>
        {canMutateMentee ? (
          <Grid item xs={3} container justifyContent="flex-end">
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                component={RemixLink}
                to={`/dashboard/mentees/${mentee.id}/edit`}
              >
                Edit
              </Button>
              <Form method="delete">
                <Button
                  variant="outlined"
                  size="small"
                  type="submit"
                  color="error"
                  value="delete_mentee"
                  disabled={isDeletingMentee}
                  name="_action"
                >
                  Delete
                </Button>
              </Form>
            </Stack>
          </Grid>
        ) : null}
      </Grid>
      <Grid item xs={12} container spacing={2}>
        <Grid item xs={12} lg={6}>
          <PagePaper>
            <BackgroundLetterAvatars
              name={`${mentee.firstName} ${mentee.lastName}`}
              sx={{
                width: 120,
                height: 120,
                fontSize: 48,
                float: "right",
              }}
            />
            {Object.entries({
              Gender: <GenderIcon gender={mentee.gender} />,
              Email: (
                <PendingMuiLink
                  to={`/dashboard/mentees/email/?to=${mentee.email}`}
                >
                  {mentee.email}
                </PendingMuiLink>
              ),
              Degree: getHumanReadableDegree(mentee.degree),
              "Home University": mentee.homeUniversity,
              "Host Faculty": mentee.hostFaculty,
              Country:
                getCountryFromCode(mentee.countryCode)?.label ?? "Unknown",
              Buddy: (
                <PendingMuiLink to={`/dashboard/users/${mentee.buddy.email}`}>
                  {`${mentee.buddy.firstName} ${mentee.buddy.lastName}`}
                </PendingMuiLink>
              ),
              "Agreement Start Date": new Date(
                mentee.agreementStartDate,
              ).toLocaleDateString(),
              "Agreement End Date": new Date(
                mentee.agreementEndDate,
              ).toLocaleDateString(),
              Status: getHumanReadableMenteeStatus(mentee.status),
            }).map(([key, value]) => (
              <Typography
                key={key}
                variant="body1"
                sx={{ mt: 1, display: "flex" }}
              >
                <Box fontWeight="fontWeightMedium" display="inline">
                  {key}
                </Box>
                {": \u00A0"}
                {value}
              </Typography>
            ))}
            <Box sx={{ clear: "both" }} />
          </PagePaper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Stack spacing={1}>
            <Form method="post" ref={formRef} style={{ textAlign: "right" }}>
              <TextField
                name="content"
                label="Add a note"
                minRows={3}
                disabled={isAddingNote}
                inputRef={textareaRef}
                sx={{ backgroundColor: "white" }}
                multiline
                fullWidth
              />
              <Button
                type="submit"
                name="_action"
                value="create_note"
                disabled={isAddingNote}
                sx={{ my: 1 }}
              >
                Add Note
              </Button>
            </Form>
            {notes.map(note => {
              const authorFullName = `${note.author.firstName} ${note.author.lastName}`
              const isBeingEdited = note.id === editingId
              const isCurrentNoteBeingUpdated =
                isUpdatingNote &&
                transition.submission?.formData.get("id") === note.id
              const isCurrentNoteBeingDeleted =
                isDeletingNote &&
                transition.submission?.formData.get("id") === note.id
              return (
                <Paper key={note.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <BackgroundLetterAvatars name={authorFullName} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <>
                          {authorFullName} -{" "}
                          <Typography variant="caption">
                            Wrote on{" "}
                            {new Date(note.createdAt).toLocaleDateString()}
                            {note.updatedAt
                              ? ` and updated on ${new Date(
                                  note.updatedAt,
                                ).toLocaleDateString()}`
                              : ""}
                          </Typography>
                        </>
                      }
                      secondary={
                        isBeingEdited ? (
                          <>
                            <TextField
                              name="content"
                              minRows={3}
                              defaultValue={note.content}
                              inputProps={{
                                form: "editForm",
                              }}
                              multiline
                              fullWidth
                            />
                          </>
                        ) : (
                          note.content
                        )
                      }
                    />
                  </ListItem>
                  {note.canBeMutated ? (
                    <Box sx={{ mb: 1, mr: 2.5 }}>
                      <Stack direction="row-reverse" spacing={1}>
                        {isBeingEdited ? (
                          <>
                            <Form id="editForm" method="post">
                              <input type="hidden" name="id" value={note.id} />
                              <IconButton
                                edge="end"
                                aria-label="update note"
                                name="_action"
                                value="update_note"
                                type="submit"
                                disabled={isCurrentNoteBeingUpdated}
                              >
                                <Icon path={mdiCheck} size={1} />
                              </IconButton>
                            </Form>
                            <IconButton
                              edge="end"
                              aria-label="cancel editing note"
                              disabled={isCurrentNoteBeingUpdated}
                              onClick={() => setEditingId(null)}
                            >
                              <Icon path={mdiClose} size={1} />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              edge="end"
                              aria-label="edit"
                              onClick={() => setEditingId(note.id)}
                            >
                              <Icon path={mdiPencilOutline} size={1} />
                            </IconButton>
                            <Form method="post" style={{ display: "inline" }}>
                              <input type="hidden" name="id" value={note.id} />
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                type="submit"
                                name="_action"
                                value="delete_note"
                                disabled={isCurrentNoteBeingDeleted}
                              >
                                <Icon path={mdiTrashCanOutline} size={1} />
                              </IconButton>
                            </Form>
                          </>
                        )}
                      </Stack>
                    </Box>
                  ) : null}
                </Paper>
              )
            })}
          </Stack>
        </Grid>
      </Grid>
    </Grid>
  )
}
