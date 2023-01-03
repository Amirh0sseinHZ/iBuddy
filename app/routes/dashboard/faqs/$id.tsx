import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import {
  Form,
  useLoaderData,
  useNavigate,
  useTransition,
} from "@remix-run/react"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Stack from "@mui/material/Stack"

import { canUserMutateFAQ, deleteFAQ, getFAQById } from "~/models/faq.server"
import { requireUser } from "~/session.server"

export async function loader({ request, params }: LoaderArgs) {
  const user = await requireUser(request)
  const { id } = params
  invariant(id, "id is required")
  const faq = await getFAQById(id)
  invariant(faq, "FAQ not found")
  return json({ faq, canUserMutateFAQ: canUserMutateFAQ(user, faq) })
}

export async function action({ request, params }: ActionArgs) {
  const user = await requireUser(request)
  const { id } = params
  invariant(id, "id is required")
  const faq = await getFAQById(id)
  invariant(canUserMutateFAQ(user, faq), "Not allowed to delete faq")
  await deleteFAQ(id)
  return redirect(`/dashboard/faqs`)
}

export default function FAQPage() {
  const { faq, canUserMutateFAQ } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const transition = useTransition()
  const isBusy =
    transition.state !== "idle" &&
    transition.submission?.formData.get("_action") === "delete_faq"

  return (
    <>
      <Typography variant="body1">{faq.answer}</Typography>
      {canUserMutateFAQ ? (
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button
            size="small"
            onClick={() => navigate(`/dashboard/faqs/${faq.id}/edit`)}
          >
            Edit
          </Button>
          <Form method="post">
            <Button
              color="error"
              size="small"
              type="submit"
              name="_action"
              value="delete_faq"
              disabled={isBusy}
            >
              Delete
            </Button>
          </Form>
        </Stack>
      ) : null}
    </>
  )
}
