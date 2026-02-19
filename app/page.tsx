import { auth, signOut } from "@/auth";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          BRK Academy&nbsp;
          <code className="font-mono font-bold">Authentication Demo</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          {session ? (
            <div className="flex items-center gap-4">
              <span>Signed in as {session.user?.name} ({session.user?.email})</span>
              <form
                action={async () => {
                  "use server"
                  await signOut()
                }}
              >
                <button className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link href="/login" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                Sign In
              </Link>
              <Link href="/register" className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center">
        <h1 className="text-4xl font-bold">Welcome to BRK Academy</h1>
      </div>
    </div>
  );
}
