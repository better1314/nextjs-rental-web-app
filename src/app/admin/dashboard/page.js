"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, Building, Home, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { dashboardAPI } from "@/common/api"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState("")
  const [user, setUser] = useState({})
  const [statsData, setStatsData] = useState({
    totalActiveTenants: 0,
    totalActiveProperties: 0,
    totalActiveRentals: 0,
  })

  // API call on component mount
  useEffect(() => {
    const doInit = async () => {
      try {
        setIsLoading(true)
        setApiError("")

        if (await !sessionUtils.isLoggedIn()) {
          router.push("/login")
          return
        }

        if (await !sessionUtils.isAdmin()) {
          router.push("/")
          return
        }

        // Get user data from session
        const user = sessionUtils.getUser()
        setUser(user)
        setIsAuthorized(true)

        // Fetch admin dashboard stats from backend
        const statsResponse = await dashboardAPI.getDashboardStats()

        if (statsResponse) {
          setStatsData({
            totalActiveTenants: statsResponse.totalActiveTenants || 0,
            totalActiveProperties: statsResponse.totalActiveProperties || 0,
            totalActiveRentals: statsResponse.totalActiveRentals || 0,
          })
        } else {
          throw new Error(statsResponse?.message || "Failed to fetch dashboard statistics")
        }

        console.log("Admin dashboard data loaded successfully")
      } catch (error) {
        console.error("Admin Dashboard API Error:", error)
        setApiError(error.message || "Failed to load admin dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    doInit()
  }, [router])

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleTryAgain = () => {
    window.location.reload()
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Admin Dashboard</h3>
            <p className="text-sm text-slate-600 text-center">Please wait while we load the admin panel...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (apiError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Something went wrong</h3>
            <p className="text-sm text-slate-600 text-center mb-6">{apiError}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={handleBackToHome} variant="outline" className="flex-1 bg-transparent">
                Back to Homepage
              </Button>
              <Button onClick={handleTryAgain} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Access Denied</h3>
            <p className="text-sm text-slate-600 text-center mb-6">You don't have permission to access this page.</p>
            <Button onClick={handleBackToHome} className="w-full">
              Back to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AdminDashboardLayout>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Hi, {user.fullName}!</h1>
        <p className="text-slate-600">Welcome to Admin Panel</p>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Active Tenants */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Registered Tenants</CardTitle>
            <UserCheck className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">{statsData.totalActiveTenants}</div>
            <p className="text-xs text-slate-500">Successfully registered and Status Active</p>
          </CardContent>
        </Card>

        {/* Total Active Properties/Rooms */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Active Properties</CardTitle>
            <Building className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">{statsData.totalActiveProperties}</div>
            <p className="text-xs text-slate-500">All properties</p>
          </CardContent>
        </Card>

        {/* Total Active Rentals */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Active Rentals</CardTitle>
            <Home className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">{statsData.totalActiveRentals}</div>
            <p className="text-xs text-slate-500">Currently active rental agreements</p>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
