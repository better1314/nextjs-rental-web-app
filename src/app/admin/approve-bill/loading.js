export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Approve Bills...</h3>
          <p className="text-sm text-slate-600 text-center">Please wait while we load the bill approval page...</p>
        </div>
      </div>
    </div>
  )
}