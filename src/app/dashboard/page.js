"use client";

import { useState, useEffect} from 'react';
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  User,
  Calendar,
  Phone,
  Mail,
  Home,
  MapPin,
  DoorOpen,
  CalendarDays,
  DollarSign,
  LogOut,
  Mountain,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { fetcher } from "@/common/webclient"
import { sessionUtils } from "@/common/session"
import { TenantBillSection } from "@/components/tenant-bill-section"

export default function Dashboard() {
  const router = useRouter()
  const [userDetails, setUserDetails] = useState({})
  const [rentalResponse, setRentalResponse] = useState({})
  const [currentRentalIndex, setCurrentRentalIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const doInit = async () => {
    try{
        setIsLoading(true)
        setApiError("")

        if (!sessionUtils.isLoggedIn()) {
          router.push("/login")
          return
        }
        const user = sessionUtils.getUser()
        setUserDetails(user)
        setIsAuthorized(true)

        if (user.roleCode === "A") {
          // If admin tries to access normal dashboard, redirect to admin dashboard
          router.push("/admin/dashboard")
          return
        }

        if (user.roleCode !== "N") {
          // If role is neither A nor N, redirect to home
          router.push("/")
          return
        }

        const rentalResponse = await fetcher("http://localhost:8081/rental/retrieveRental", {
              body : JSON.stringify({
                userId: user.userId,
              })
            })

        setRentalResponse(rentalResponse)
      }catch(error){
        console.error("doInit Error :", error)

        if (error.message) {
          setApiError(error.message)
        } else {
          setApiError("Registration failed. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    };

    doInit();
  }, [router]);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-SG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePreviousRental = () => {
    setCurrentRentalIndex((prev) => (prev === 0 ? rentalResponse.rentalDetailsList.length - 1 : prev - 1))
  }

  const handleNextRental = () => {
    setCurrentRentalIndex((prev) => (prev === rentalResponse.rentalDetailsList.length - 1 ? 0 : prev + 1))
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleTryAgain = () => {
    window.location.reload()
  }

  const handleLogout = () => {
    // Clear session and redirect to home
    sessionUtils.clearSession()
    router.push("/")
  }

  const currentRental = rentalResponse.hasRental ? rentalResponse.rentalDetailsList[currentRentalIndex] : null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Dashboard</h3>
            <p className="text-sm text-slate-600 text-center">Please wait while we load your information...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mountain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-slate-800">RentEase</span>
            </div>

            {/* Logout Button */}
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Hi, {userDetails.fullName}!</h1>
          <p className="text-slate-600">Welcome to your tenant dashboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Details Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>Your registered details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Full Name</p>
                    <p className="text-sm text-slate-600">{userDetails.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Email</p>
                    <p className="text-sm text-slate-600">{userDetails.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Date of Birth</p>
                    <p className="text-sm text-slate-600">{formatDate(userDetails.dateOfBirth)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Contact Number</p>
                    <p className="text-sm text-slate-600">{userDetails.contactNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">NRIC</p>
                    <p className="text-sm text-slate-600">{userDetails.nric}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenancy Details Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Home className="w-5 h-5" />
                  <span>Current Tenancy</span>
                </div>
                {rentalResponse.hasRental && rentalResponse.totalRental > 1 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500">
                      {currentRentalIndex + 1} of {rentalResponse.totalRental}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousRental}
                        className="h-8 w-8 p-0 bg-transparent"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextRental}
                        className="h-8 w-8 p-0 bg-transparent"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {rentalResponse.hasRental
                  ? `Your rental information ${rentalResponse.totalRental > 1 ? `(${rentalResponse.totalRental} contracts)` : ""}`
                  : "Your rental information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!rentalResponse.hasRental ? (
                <div className="text-center py-8">
                  <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Tenancy at the moment</h3>
                  <p className="text-slate-600">You don't have any active rental agreements</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-slate-900">{currentRental.propertyName}</h3>
                    <Badge className="bg-green-100 text-green-800 border-green-200">{currentRental.rentalStatus}</Badge>
                  </div>

                  <Separator />

                  {/* Property Details */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Property Address</p>
                        <p className="text-sm text-slate-600">{currentRental.propertyAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DoorOpen className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Room Number</p>
                        <p className="text-sm text-slate-600">{currentRental.roomName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Start Date</p>
                          <p className="text-sm text-slate-600">{formatDate(currentRental.tenureStartDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">End Date</p>
                          <p className="text-sm text-slate-600">{formatDate(currentRental.tenureEndDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Monthly Amount</p>
                        <p className="text-sm text-slate-600 font-semibold">
                          ${currentRental.monthlyRentalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rental Indicators */}
                  {rentalResponse.totalRental > 1 && (
                    <div className="flex justify-center space-x-2 pt-4">
                      {rentalResponse.rentalDetailsList.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentRentalIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentRentalIndex ? "bg-primary" : "bg-slate-300 hover:bg-slate-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bills & Payment Section */}
        <div className="mt-8">
          <TenantBillSection selectedRental={currentRental ? {
            id: currentRental.rentalId,
            ...currentRental
          } : null} />
        </div>
      </main>
    </div>
  )
}
