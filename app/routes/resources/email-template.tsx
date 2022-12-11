import type { LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import {
  getAllEmailTemplates,
  getUserAccessibleAssets,
} from "~/models/asset.server"
import { Role } from "~/models/user.server"
import { requireUser } from "~/session.server"

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const isAdmin = user.role === Role.ADMIN
  const emailTemplates = await (isAdmin
    ? getAllEmailTemplates()
    : getUserAccessibleAssets(user.id, { type: "email-template" }))

  const url = new URL(request.url)
  const templateId = url.searchParams.get("templateId")
  invariant(templateId, "templateId is required")

  const template = emailTemplates.find(t => t.id === templateId)
  invariant(template, "template not found")
  return json({ template: template.src })
}
