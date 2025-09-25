export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Loading...</h3>
        <p className="text-sm text-slate-600">Please wait while we load the scheduler information...</p>
      </div>
    </div>
  )
}
