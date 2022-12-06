import * as React from "react"
import { Response } from "@remix-run/node"
import {
  useLoaderData,
  Form,
  useTransition,
  Link as RemixLink,
} from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import Button from "@mui/material/Button"
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
import { Box, Divider, Grid, Link, Paper, Typography } from "@mui/material"
import { PendingLink } from "~/components/link"

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
    const canBeMutated = canUserMutateNote(user, note)
    return { ...restOfNote, author, canBeMutated }
  })
  return json({
    notes: notesWithAuthorsAndPermissions,
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
  }
  if (_action === "delete_mentee") {
    invariant(menteeId, "menteeId is required")
    invariant(canUserMutateMentee(user), "Not allowed to delete mentee")
    await deleteMentee(menteeId)
    return redirect("/dashboard/mentees")
  }
  return new Response()
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
    <Box sx={{ width: "100%", mt: 6 }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Grid container sx={{ paddingY: 4, paddingX: 2 }}>
          <Grid item xs={12}>
            <Box sx={{ paddingX: 2 }}>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {mentee.firstName} {mentee.lastName}
              </Typography>
              {canMutateMentee ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
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
                      type="submit"
                      color="error"
                      value="delete_mentee"
                      disabled={isDeletingMentee}
                      name="_action"
                    >
                      Delete
                    </Button>
                  </Form>
                </Box>
              ) : null}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Gender
                </Box>
                {": "}
                {mentee.gender}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Email
                </Box>
                {": "}
                <Link target="_blank" href={`mailto:${mentee.email}`}>
                  {mentee.email}
                </Link>
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Degree
                </Box>
                {": "}
                {mentee.degree}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Home University
                </Box>
                {": "}
                {mentee.homeUniversity}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Host Faculty
                </Box>
                {": "}
                {mentee.hostFaculty}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Buddy
                </Box>
                {": "}
                <Box sx={{ display: "inline", color: "primary.main" }}>
                  <PendingLink to={`/dashboard/users/${mentee.buddy.email}`}>
                    {mentee.buddy.firstName} {mentee.buddy.lastName}
                  </PendingLink>
                </Box>
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Country
                </Box>
                {": "}
                {mentee.countryCode}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Agreement start date
                </Box>
                {": "}
                {new Date(mentee.agreementStartDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <Box fontWeight="fontWeightMedium" display="inline">
                  Agreement end date
                </Box>
                {": "}
                {new Date(mentee.agreementEndDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ paddingX: 4 }}>
              <h1>Notes</h1>
              <ul>
                {notes.map(note => {
                  const isEditing = note.id === editingId
                  return (
                    <li key={note.id}>
                      {isEditing ? (
                        <Form method="post">
                          <input type="hidden" name="id" value={note.id} />
                          <textarea name="content">{note.content}</textarea>
                          <button
                            name="_action"
                            value="update_note"
                            type="submit"
                            aria-label="update"
                            disabled={isUpdatingNote}
                          >
                            Save
                          </button>
                          <button
                            disabled={isUpdatingNote}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </Form>
                      ) : (
                        <p>
                          <b>
                            {note.author?.firstName} {note.author?.lastName}
                          </b>
                          : {note.content}
                          <small> created at {note.createdAt}</small>
                          {note.updatedAt ? (
                            <small> updated at {note.updatedAt}</small>
                          ) : null}
                          {note.canBeMutated ? (
                            <>
                              <button onClick={() => setEditingId(note.id)}>
                                ✎
                              </button>
                              <Form method="post" style={{ display: "inline" }}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={note.id}
                                />
                                <button
                                  name="_action"
                                  value="delete_note"
                                  type="submit"
                                  aria-label="delete"
                                  disabled={
                                    isDeletingNote &&
                                    transition.submission?.formData.get(
                                      "id",
                                    ) === note.id
                                  }
                                >
                                  x
                                </button>
                              </Form>
                            </>
                          ) : null}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Form method="post" ref={formRef}>
              <textarea
                ref={textareaRef}
                name="content"
                disabled={isAddingNote}
              />
              <button
                name="_action"
                value="create_note"
                type="submit"
                disabled={isAddingNote}
              >
                Add Note
              </button>
            </Form>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
