import * as React from "react"
import { Response } from "@remix-run/node"
import { useLoaderData, Form, useTransition } from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import Button from "@mui/material/Button"
import {
  createNote,
  deleteMentee,
  deleteNote,
  getNotesOfMentee,
} from "~/models/mentee.server"

export async function loader({ params }: LoaderArgs) {
  const { menteeId } = params
  invariant(menteeId, "menteeId is required")
  const notes = await getNotesOfMentee(menteeId)
  return json({ notes })
}

export async function action({ request, params }: ActionArgs) {
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
    await createNote({ menteeId, content })
  }
  if (_action === "delete_note") {
    invariant(
      typeof menteeId === "string" && typeof noteId === "string",
      "Form submitted incorrectly",
    )
    await deleteNote({ menteeId, noteId })
  }
  if (_action === "delete_mentee") {
    invariant(menteeId, "menteeId is required")
    await deleteMentee(menteeId)
    return redirect("/dashboard/mentees")
  }
  return new Response()
}

export default function MenteeIndexPage() {
  const { notes } = useLoaderData<typeof loader>()
  const transition = useTransition()

  const formRef = React.useRef<HTMLFormElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const isAddingNote = transition.state === "submitting"

  React.useEffect(() => {
    if (!isAddingNote) {
      formRef.current?.reset()
      textareaRef.current?.focus()
    }
  }, [isAddingNote])

  return (
    <div>
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
      <h1>Notes</h1>
      <ul>
        {notes.map(note => (
          <li key={note.id}>
            {note.content}
            <Form method="post" style={{ display: "inline" }}>
              <input type="hidden" name="id" value={note.id} />
              <button
                name="_action"
                value="delete_note"
                type="submit"
                aria-label="delete"
              >
                x
              </button>
            </Form>
          </li>
        ))}
      </ul>
      <Form method="post" ref={formRef}>
        <textarea ref={textareaRef} name="content" />
        <button name="_action" value="create_note" type="submit">
          Add Note
        </button>
      </Form>
    </div>
  )
}
