import { Link } from "@remix-run/react"

import { useOptionalUser } from "~/utils/user"
import { ResponsiveAppBar } from "~/components/app-bar"

export default function Index() {
  const user = useOptionalUser()
  return (
    <main>
      {user ? (
        <>
          <ResponsiveAppBar user={user} />
          <Link to="/componotes">View Notes for {user.email}</Link>
        </>
      ) : (
        <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
          <Link
            to="/signup"
            className="flex items-center justify-center px-4 py-3 text-base font-medium text-red-700 bg-white border border-transparent rounded-md shadow-sm hover:bg-red-50 sm:px-8"
          >
            Sign up
          </Link>
          <Link
            to="/signin"
            className="flex items-center justify-center px-4 py-3 font-medium text-white bg-red-500 rounded-md hover:bg-red-600 "
          >
            Log In
          </Link>
        </div>
      )}
    </main>
  )
}
