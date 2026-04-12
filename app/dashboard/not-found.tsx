import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-muted-foreground/30 mb-4">404</p>
        <h2 className="text-xl font-semibold mb-2">Website not found</h2>
        <p className="text-muted-foreground mb-6">
          The website you are looking for does not exist or you don&apos;t have
          access to it.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
