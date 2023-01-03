import * as z from "zod"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
  useTransition,
} from "@remix-run/react"
import invariant from "tiny-invariant"

import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"

import { validateAction, Zod } from "~/utils/validation"
import { requireUser } from "~/session.server"
import { canUserMutateFAQ, getFAQById, updateFAQ } from "~/models/faq.server"
import { useForm } from "~/components/hooks/use-form"

export async function loader({ request, params }: LoaderArgs) {
  const user = await requireUser(request)
  const { id } = params
  invariant(id, "id is required")
  const faq = await getFAQById(id)
  invariant(canUserMutateFAQ(user, faq), "Not allowed to update faq")
  invariant(faq, "FAQ not found")
  return json({ faq })
}

const schema = z.object({
  question: Zod.requiredString("Question"),
  answer: Zod.requiredString("Answer"),
})

type ActionInput = z.TypeOf<typeof schema>

export async function action({ request, params }: ActionArgs) {
  const user = await requireUser(request)
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  const { id } = params
  invariant(id, "id is required")
  const faq = await getFAQById(id)
  invariant(faq, "FAQ not found")
  invariant(canUserMutateFAQ(user, faq), "Not allowed to update faq")
  await updateFAQ(id, formData)
  return redirect(`/dashboard/faqs/${id}`)
}

export default function FAQPage() {
  const { faq } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const navigate = useNavigate()
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)

  return (
    <Form method="post" noValidate>
      <Stack spacing={1} sx={{ mb: 1 }}>
        <TextField
          fullWidth
          label="Question"
          defaultValue={faq.question}
          {...register("question")}
        />
        <TextField
          multiline
          fullWidth
          label="Answer"
          rows={4}
          defaultValue={faq.answer}
          {...register("answer")}
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button
            color="inherit"
            size="small"
            onClick={() => navigate(`/dashboard/faqs/${faq.id}`)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button color="primary" size="small" type="submit" disabled={isBusy}>
            Save
          </Button>
        </Stack>
      </Stack>
    </Form>
  )
}
