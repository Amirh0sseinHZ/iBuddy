import * as React from "react"
import { Response } from "@remix-run/node"
import { useLoaderData, Form, useTransition } from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import Button from "@mui/material/Button"
import type { Note } from "~/models/mentee.server"
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

export async function loader({ params, request }: LoaderArgs) {
  const user = await requireUser(request)
  const { menteeId } = params
  invariant(menteeId, "menteeId is required")
  const notes = await getNotesOfMentee(menteeId)
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

export default function MenteeIndexPage() {
  const { notes, canMutateMentee } = useLoaderData<typeof loader>()
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

  return (
    <div>
      {canMutateMentee ? (
        <Form method="delete">
          <Button
            type="submit"
            color="error"
            value="delete_mentee"
            name="_action"
          >
            Delete
          </Button>
        </Form>
      ) : null}
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
                      <button onClick={() => setEditingId(note.id)}>✎</button>
                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={note.id} />
                        <button
                          name="_action"
                          value="delete_note"
                          type="submit"
                          aria-label="delete"
                          disabled={
                            isDeletingNote &&
                            transition.submission?.formData.get("id") ===
                              note.id
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
      <Form method="post" ref={formRef}>
        <textarea ref={textareaRef} name="content" disabled={isAddingNote} />
        <button
          name="_action"
          value="create_note"
          type="submit"
          disabled={isAddingNote}
        >
          Add Note
        </button>
      </Form>
    </div>
  )
}
