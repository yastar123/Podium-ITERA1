export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Ticket War MVP
        </h1>
        <div className="grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-4">
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Student Login
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Login to claim your event tickets
            </p>
          </div>
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Admin Panel
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Manage events and validate tickets
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}