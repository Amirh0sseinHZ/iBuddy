import * as React from "react"
import * as z from "zod"
import type {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
} from "@remix-run/server-runtime"
import {
  Form,
  Outlet,
  useActionData,
  useLoaderData,
  useNavigate,
  useParams,
  useTransition,
} from "@remix-run/react"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"

import Accordion from "@mui/material/Accordion"
import AccordionDetails from "@mui/material/AccordionDetails"
import AccordionSummary from "@mui/material/AccordionSummary"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import { mdiChevronDown } from "@mdi/js"
import Icon from "@mdi/react"

import { canUserCreateFAQ, createFAQ, getAllFAQs } from "~/models/faq.server"
import { pick } from "~/utils/object"
import { requireUser } from "~/session.server"
import { validateAction, Zod } from "~/utils/validation"
import { useForm } from "~/components/hooks/use-form"

export const meta: MetaFunction = () => {
  return {
    title: "Frequently asked questions - iBuddy",
  }
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const faqs = await getAllFAQs()
  const sortedFAQs = faqs.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  return json({
    faqs: sortedFAQs.map(faq =>
      pick(faq, "id", "question", "updatedAt", "createdAt"),
    ),
    canUserCreateFAQ: canUserCreateFAQ(user),
  })
}

const schema = z.object({
  question: Zod.requiredString("Question"),
  answer: Zod.requiredString("Answer"),
})

type ActionInput = z.TypeOf<typeof schema>

export async function action({ request }: ActionArgs) {
  const user = await requireUser(request)
  invariant(canUserCreateFAQ(user), "Not allowed to create faq")
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  await createFAQ({
    ...formData,
    authorId: user.id,
  })
  return null
}

export default function FAQsIndexPage() {
  const { faqs, canUserCreateFAQ } = useLoaderData<typeof loader>()
  const actionData = useActionData()
  const errors = actionData?.errors
  const { register } = useForm(errors)
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const transition = useTransition()
  const isBusy = transition.state !== "idle" && Boolean(transition.submission)
  const formRef = React.useRef<HTMLFormElement>(null)
  const isSubmitting = transition.state === "submitting"

  React.useEffect(() => {
    if (!isSubmitting && !errors) {
      formRef.current?.reset()
      formRef.current?.querySelector("input")?.focus()
    }
  }, [errors, isSubmitting])

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Grid container>
          <Typography
            component="h1"
            variant="h4"
            sx={{ color: "#505050", fontWeight: 600 }}
          >
            Frequently asked questions
          </Typography>
        </Grid>
      </Grid>
      {canUserCreateFAQ ? (
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<Icon path={mdiChevronDown} size={1} />}
            >
              <Typography>Add new FAQ</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Form method="post" ref={formRef} noValidate>
                <Stack spacing={2}>
                  <TextField
                    autoFocus
                    required
                    fullWidth
                    label="Question"
                    {...register("question")}
                  />
                  <TextField
                    multiline
                    fullWidth
                    rows={4}
                    label="Answer"
                    required
                    {...register("answer")}
                  />
                  <Button type="submit" disabled={isBusy}>
                    Add
                  </Button>
                </Stack>
              </Form>
            </AccordionDetails>
          </Accordion>
        </Grid>
      ) : null}
      <Grid item xs={12}>
        {faqs.map(faq => (
          <Accordion
            key={faq.id}
            expanded={paramId === faq.id}
            onChange={() => navigate(`/dashboard/faqs/${faq.id}`)}
          >
            <AccordionSummary
              expandIcon={<Icon path={mdiChevronDown} size={1} />}
            >
              <Typography>{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Written at: {new Date(faq.createdAt).toLocaleString()}
                  {faq.updatedAt
                    ? ` and updated at: ${new Date(
                        faq.updatedAt,
                      ).toLocaleString()}`
                    : null}
                </Typography>
                <Outlet />
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Grid>
    </Grid>
  )
}
