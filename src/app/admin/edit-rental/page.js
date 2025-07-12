"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import {
  FileText,
  Calendar,
  DollarSign,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Save,
  Trash2,
  Home,
  MapPin,
  DoorOpen,
  User,
  Phone,
  Mail,
  CreditCard,
  Clock,
  Activity,
} from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { rentalAPI } from "@/common/api"

// Custom hook for debounced search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

// Helper function to format date for display
function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Helper function to format datetime for display
function formatDateTime(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount)
}

// Helper function to get status badge variant and color
function getStatusBadge(status) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" }
    case "PENDING":
      return { variant: "secondary", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" }
    case "EXPIRED":
      return { variant: "outline", className: "bg-red-100 text-red-800 hover:bg-red-100" }
    case "TERMINATED":
      return { variant: "destructive", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" }
    default:
      return { variant: "outline", className: "" }
  }
}

export default function EditRentalPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingRental, setIsDeletingRental] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errors, setErrors] = useState({})

  // Rental search states
  const [rentalSearchQuery, setRentalSearchQuery] = useState("")
  const [rentalSearchResults, setRentalSearchResults] = useState([])
  const [isRentalSearchLoading, setIsRentalSearchLoading] = useState(false)
  const [rentalSearchOpen, setRentalSearchOpen] = useState(false)
  const [rentalPage, setRentalPage] = useState(1)
  const [rentalHasMore, setRentalHasMore] = useState(true)
  const [selectedRentalId, setSelectedRentalId] = useState("")

  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteRemark, setDeleteRemark] = useState("")
  const [deleteRemarkError, setDeleteRemarkError] = useState("")

  // Form data state - updated to match new API structure
  const [formData, setFormData] = useState({
    id: "",
    rentalStartDate: "",
    rentalEndDate: "",
    monthlyAmount: "",
    createdOn: "",
    rentalStatus: "",
    roomId: "",
    roomName: "",
    propertyName: "",
    propertyAddress: "",
    fullName: "",
    contactNo: "",
    nric: "",
    email: "",
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState({})

  // Debounced search query
  const debouncedRentalSearch = useDebounce(rentalSearchQuery, 300)

  // Check authorization on component mount
  useEffect(() => {
    const doInit = async () => {
      try {
        setIsLoading(true)
        if (!sessionUtils.isLoggedIn()) {
          router.push("/login")
          return
        }
        if (!sessionUtils.isAdmin()) {
          router.push("/")
          return
        }
        setIsAuthorized(true)
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    doInit()
  }, [router])

  // Search rentals with server-side filtering and pagination
  const searchRentals = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsRentalSearchLoading(true)
      const result = await rentalAPI.searchRentals(query, page, 20)
      if (result.success) {
        if (reset || page === 1) {
          setRentalSearchResults(result.rentals)
        } else {
          setRentalSearchResults((prev) => [...prev, ...result.rentals])
        }
        setRentalHasMore(result.hasMore)
        setRentalPage(result.page)
        console.log(`Loaded ${result.rentals.length} rentals, Total: ${result.totalCount}, Has More: ${result.hasMore}`)
      } else {
        console.error("Rental search failed:", result.error)
        if (reset || page === 1) {
          setRentalSearchResults([])
          setRentalHasMore(false)
        }
      }
    } catch (error) {
      console.error("Unexpected error in searchRentals:", error)
      if (reset || page === 1) {
        setRentalSearchResults([])
        setRentalHasMore(false)
      }
    } finally {
      setIsRentalSearchLoading(false)
    }
  }, [])

  // Effect for debounced rental search
  useEffect(() => {
    if (rentalSearchOpen) {
      searchRentals(debouncedRentalSearch, 1, true)
    }
  }, [debouncedRentalSearch, rentalSearchOpen, searchRentals])

  // Load more rentals (infinite scroll)
  const loadMoreRentals = useCallback(() => {
    if (rentalHasMore && !isRentalSearchLoading) {
      searchRentals(debouncedRentalSearch, rentalPage + 1, false)
    }
  }, [rentalHasMore, isRentalSearchLoading, debouncedRentalSearch, rentalPage, searchRentals])

  const handleRentalSelect = (rentalId) => {
    setSelectedRentalId(rentalId)
    setRentalSearchOpen(false)
    const selectedRentalData = rentalSearchResults.find((rental) => rental.id === rentalId)

    if (selectedRentalData) {
      // Map the flat API response structure to form data
      const rentalData = {
        id: selectedRentalData.id || "",
        rentalStartDate: selectedRentalData.rentalStartDate || "",
        rentalEndDate: selectedRentalData.rentalEndDate || "",
        monthlyAmount: selectedRentalData.monthlyAmount?.toString() || "",
        createdOn: selectedRentalData.createdOn || "",
        rentalStatus: selectedRentalData.rentalStatus || "",
        roomId: selectedRentalData.roomId || "",
        roomName: selectedRentalData.roomName || "",
        propertyName: selectedRentalData.propertyName || "",
        propertyAddress: selectedRentalData.propertyAddress || "",
        fullName: selectedRentalData.fullName || "",
        contactNo: selectedRentalData.contactNo || "",
        nric: selectedRentalData.nric || "",
        email: selectedRentalData.email || "",
      }
      setFormData(rentalData)
      setOriginalData(rentalData)
    }

    // Clear any existing messages
    setApiError("")
    setSuccessMessage("")
    setErrors({})
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
    if (apiError) {
      setApiError("")
    }
    if (successMessage) {
      setSuccessMessage("")
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Rental Details validation
    if (!formData.rentalStartDate) {
      newErrors.rentalStartDate = "Rental start date is required"
    }
    if (!formData.rentalEndDate) {
      newErrors.rentalEndDate = "Rental end date is required"
    }
    if (formData.rentalStartDate && formData.rentalEndDate) {
      const startDate = new Date(formData.rentalStartDate)
      const endDate = new Date(formData.rentalEndDate)
      if (startDate > endDate) {
        newErrors.rentalEndDate = "End date cannot be before start date"
      }
    }
    if (!formData.monthlyAmount) {
      newErrors.monthlyAmount = "Monthly amount is required"
    } else if (isNaN(Number(formData.monthlyAmount)) || Number(formData.monthlyAmount) <= 0) {
      newErrors.monthlyAmount = "Monthly amount must be a positive number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdate = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      setApiError("Please correct the errors in the form.")
      return
    }

    setIsSubmitting(true)
    setApiError("")
    setSuccessMessage("")

    try {
      await rentalAPI.updateRental({
        id: formData.id,
        rentalStartDate: formData.rentalStartDate,
        rentalEndDate: formData.rentalEndDate,
        monthlyAmount: Number.parseFloat(formData.monthlyAmount),
      })

      setSuccessMessage("Rental agreement updated successfully!")
      // Update original data to reflect changes
      setOriginalData({ ...formData })
    } catch (error) {
      console.error("Update rental error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update rental agreement. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRental = async () => {
    if (!formData.id) {
      setApiError("No rental agreement selected to delete.")
      return
    }

    // Validate remark
    if (!deleteRemark.trim()) {
      setDeleteRemarkError("Remark is required for deletion")
      return
    }
    if (deleteRemark.length > 200) {
      setDeleteRemarkError("Remark cannot exceed 200 characters")
      return
    }

    setIsDeletingRental(true)
    setApiError("")
    setSuccessMessage("")

    try {
      await rentalAPI.deleteRental(formData.id, deleteRemark.trim())
      setSuccessMessage(`Rental agreement "${formData.id}" deleted successfully!`)
      // Clear form after successful deletion
      setFormData({
        id: "",
        rentalStartDate: "",
        rentalEndDate: "",
        monthlyAmount: "",
        createdOn: "",
        rentalStatus: "",
        roomId: "",
        roomName: "",
        propertyName: "",
        propertyAddress: "",
        fullName: "",
        contactNo: "",
        nric: "",
        email: "",
      })
      setSelectedRentalId("")
      setOriginalData({})
      setShowDeleteDialog(false)
      setDeleteRemark("")
      setDeleteRemarkError("")
    } catch (error) {
      console.error("Error deleting rental:", error)
      setApiError(error.message || "Failed to delete rental agreement. Please try again.")
    } finally {
      setIsDeletingRental(false)
    }
  }

  const handleDeleteRemarkChange = (e) => {
    const value = e.target.value
    setDeleteRemark(value)

    // Clear error when user starts typing
    if (deleteRemarkError) {
      setDeleteRemarkError("")
    }

    // Validate length
    if (value.length > 200) {
      setDeleteRemarkError("Remark cannot exceed 200 characters")
    }
  }

  const openDeleteDialog = () => {
    if (!formData.id) {
      setApiError("No rental agreement selected to delete.")
      return
    }
    setShowDeleteDialog(true)
    setDeleteRemark("")
    setDeleteRemarkError("")
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeleteRemark("")
    setDeleteRemarkError("")
  }

  // Get selected rental details for display in the combobox trigger
  const selectedRental = useMemo(() => {
    return rentalSearchResults.find((rental) => rental.id === selectedRentalId)
  }, [rentalSearchResults, selectedRentalId])

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Show loading state during auth check
  if (isLoading && !formData.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading...</h3>
            <p className="text-sm text-slate-600 text-center">Please wait while we verify your access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Access Denied</h3>
            <p className="text-sm text-slate-600 text-center mb-6">You don't have permission to access this page.</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Back to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AdminDashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Rental Agreement</h1>
        <p className="text-slate-600">Search and edit rental agreement details by room ID or tenant name</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* API Error Alert */}
      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Rental Search Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Rental Agreement</span>
          </CardTitle>
          <CardDescription>
            Search for a rental agreement by room ID, tenant name, or rental ID to edit its details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Rental Search Combobox */}
            <div className="space-y-2">
              <Label>Select Rental Agreement to Edit</Label>
              <Popover open={rentalSearchOpen} onOpenChange={setRentalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={rentalSearchOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    {selectedRental ? (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedRental.id} - {selectedRental.fullName} ({selectedRental.roomId})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search by room ID, tenant name, or rental ID...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search rental agreements..."
                      value={rentalSearchQuery}
                      onValueChange={setRentalSearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className="h-[300px]">
                        {isRentalSearchLoading && rentalSearchResults.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-slate-500">Searching rental agreements...</span>
                          </div>
                        ) : rentalSearchResults.length === 0 ? (
                          <CommandEmpty>No rental agreements found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {rentalSearchResults.map((rental) => (
                              <CommandItem
                                key={rental.id}
                                value={rental.id}
                                onSelect={() => handleRentalSelect(rental.id)}
                              >
                                <div className="flex items-center space-x-3 w-full">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedRentalId === rental.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {rental.id} - {rental.fullName}
                                      <Badge {...getStatusBadge(rental.rentalStatus)} size="sm">
                                        {rental.rentalStatus}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      Room {rental.roomId} • {formatCurrency(rental.monthlyAmount)}/month
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                            {rentalHasMore && (
                              <div className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadMoreRentals}
                                  disabled={isRentalSearchLoading}
                                  className="w-full"
                                >
                                  {isRentalSearchLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Load more rental agreements
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </CommandGroup>
                        )}
                      </ScrollArea>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Details Form */}
      {formData.id && (
        <form onSubmit={handleUpdate}>
          {/* Rental Agreement Details */}
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Rental Agreement Details</span>
              </CardTitle>
              <CardDescription>Edit rental agreement information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rental ID (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="id">Rental ID</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="id"
                      name="id"
                      type="text"
                      value={formData.id}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>

                {/* Created On (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="createdOn">Created On</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="createdOn"
                      name="createdOn"
                      type="text"
                      value={formatDateTime(formData.createdOn)}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rental Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="rentalStartDate">Rental Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="rentalStartDate"
                      name="rentalStartDate"
                      type="date"
                      value={formData.rentalStartDate}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.rentalStartDate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.rentalStartDate && <p className="text-sm text-red-500">{errors.rentalStartDate}</p>}
                </div>

                {/* Rental End Date */}
                <div className="space-y-2">
                  <Label htmlFor="rentalEndDate">Rental End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="rentalEndDate"
                      name="rentalEndDate"
                      type="date"
                      value={formData.rentalEndDate}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.rentalEndDate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.rentalEndDate && <p className="text-sm text-red-500">{errors.rentalEndDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monthly Amount */}
                <div className="space-y-2">
                  <Label htmlFor="monthlyAmount">Monthly Amount (MYR)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="monthlyAmount"
                      name="monthlyAmount"
                      type="number"
                      step="0.01"
                      placeholder="Enter monthly rental amount"
                      value={formData.monthlyAmount}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.monthlyAmount ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.monthlyAmount && <p className="text-sm text-red-500">{errors.monthlyAmount}</p>}
                </div>

                {/* Rental Status (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="rentalStatus">Rental Status</Label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <div className="pl-10 pr-3 py-2 border rounded-md bg-slate-100 flex items-center">
                      <Badge {...getStatusBadge(formData.rentalStatus)}>{formData.rentalStatus || "N/A"}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property and Room Details */}
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Property and Room Details</span>
              </CardTitle>
              <CardDescription>Property and room information (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Property Name */}
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="propertyName"
                      name="propertyName"
                      type="text"
                      value={formData.propertyName}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Room ID */}
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <div className="relative">
                    <DoorOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="roomId"
                      name="roomId"
                      type="text"
                      value={formData.roomId}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Property Address */}
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Property Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="propertyAddress"
                    name="propertyAddress"
                    type="text"
                    value={formData.propertyAddress}
                    readOnly
                    className="pl-10 bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Room Name */}
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <div className="relative">
                  <DoorOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="roomName"
                    name="roomName"
                    type="text"
                    value={formData.roomName}
                    readOnly
                    className="pl-10 bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Details */}
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Tenant Details</span>
              </CardTitle>
              <CardDescription>Tenant information (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNo">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="contactNo"
                      name="contactNo"
                      type="text"
                      value={formData.contactNo}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* NRIC */}
                <div className="space-y-2">
                  <Label htmlFor="nric">NRIC</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="nric"
                      name="nric"
                      type="text"
                      value={formData.nric}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-lg font-semibold bg-transparent"
              onClick={openDeleteDialog}
              disabled={isDeletingRental || !formData.id}
            >
              {isDeletingRental ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Rental Agreement
                </>
              )}
            </Button>
            <Button type="submit" className="flex-1 h-12 text-lg font-semibold" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Update Rental Agreement
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* No Rental Selected State */}
      {!formData.id && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Rental Agreement Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a rental agreement from the dropdown above to view and edit its details.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Delete Rental Agreement</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete rental agreement "{formData.id}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deleteRemark">Reason for deletion *</Label>
              <Textarea
                id="deleteRemark"
                placeholder="Please provide a reason for deleting this rental agreement..."
                value={deleteRemark}
                onChange={handleDeleteRemarkChange}
                className={`resize-none ${deleteRemarkError ? "border-red-500" : ""}`}
                rows={3}
                maxLength={200}
              />
              <div className="flex justify-between items-center">
                {deleteRemarkError && <p className="text-sm text-red-500">{deleteRemarkError}</p>}
                <p className="text-xs text-slate-500 ml-auto">{deleteRemark.length}/200 characters</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeletingRental}
              className="w-full sm:w-auto bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRental}
              disabled={isDeletingRental || !deleteRemark.trim() || deleteRemark.length > 200}
              className="w-full sm:w-auto"
            >
              {isDeletingRental ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Rental Agreement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
