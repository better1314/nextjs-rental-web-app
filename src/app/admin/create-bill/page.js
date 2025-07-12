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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Plus,
  Home,
  DoorOpen,
  User,
  CreditCard,
  Receipt,
  X,
} from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { billAPI, rentalAPI } from "@/common/api"

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

// Helper function to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
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

export default function CreateBillPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Bill types and bills states
  const [billTypes, setBillTypes] = useState([])
  const [isBillTypesLoading, setIsBillTypesLoading] = useState(false)
  const [bills, setBills] = useState([])

  // Selected rental data
  const [selectedRental, setSelectedRental] = useState(null)

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
        // Load bill types
        await loadBillTypes()
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    doInit()
  }, [router])

  // Load bill types
  const loadBillTypes = async () => {
    try {
      setIsBillTypesLoading(true)
      const result = await billAPI.getBillTypes()
      if (result.success) {
        setBillTypes(result.billTypes)
      } else {
        console.error("Failed to load bill types:", result.error)
        setApiError("Failed to load bill types. Please refresh the page.")
      }
    } catch (error) {
      console.error("Error loading bill types:", error)
      setApiError("Failed to load bill types. Please refresh the page.")
    } finally {
      setIsBillTypesLoading(false)
    }
  }

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
      setSelectedRental(selectedRentalData)
      // Reset bills when selecting a new rental
      setBills([])
    }

    // Clear any existing messages
    setApiError("")
    setSuccessMessage("")
    setErrors({})
  }

  const addBill = () => {
    const newBill = {
      id: Date.now(), // Temporary ID for frontend
      billType: "",
      amount: "",
      billMonth: getCurrentMonth(),
      remarks: "",
    }
    setBills((prev) => [...prev, newBill])
  }

  const removeBill = (billId) => {
    setBills((prev) => prev.filter((bill) => bill.id !== billId))
    // Clear errors for removed bill
    const newErrors = { ...errors }
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`bill-${billId}-`)) {
        delete newErrors[key]
      }
    })
    setErrors(newErrors)
  }

  const updateBill = (billId, field, value) => {
    setBills((prev) => prev.map((bill) => (bill.id === billId ? { ...bill, [field]: value } : bill)))

    // Clear errors when user starts typing
    const errorKey = `bill-${billId}-${field}`
    if (errors[errorKey]) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: "",
      }))
    }
    if (apiError) {
      setApiError("")
    }
    if (successMessage) {
      setSuccessMessage("")
    }
  }

  const validateBills = () => {
    const newErrors = {}

    if (bills.length === 0) {
      setApiError("Please add at least one bill to create.")
      return false
    }

    bills.forEach((bill) => {
      if (!bill.billType) {
        newErrors[`bill-${bill.id}-billType`] = "Bill type is required"
      }
      if (!bill.amount) {
        newErrors[`bill-${bill.id}-amount`] = "Amount is required"
      } else if (isNaN(Number(bill.amount)) || Number(bill.amount) <= 0) {
        newErrors[`bill-${bill.id}-amount`] = "Amount must be a positive number"
      }
      if (!bill.billMonth) {
        newErrors[`bill-${bill.id}-billMonth`] = "Bill month is required"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateBills = async (e) => {
    e.preventDefault()

    if (!selectedRental) {
      setApiError("Please select a rental agreement first.")
      return
    }

    if (!validateBills()) {
      setApiError("Please correct the errors in the bill forms.")
      return
    }

    setIsSubmitting(true)
    setApiError("")
    setSuccessMessage("")

    try {
      // Prepare bills data for API
      const billsData = bills.map((bill) => ({
        billType: bill.billType,
        amount: Number.parseFloat(bill.amount),
        billMonth: bill.billMonth,
        remarks: bill.remarks.trim(),
      }))

      const result = await billAPI.createBills(selectedRental.id, billsData)

      if (result.success) {
        setSuccessMessage(result.message)
        // Reset bills after successful creation
        setBills([])
      } else {
        setApiError(result.message || "Failed to create bills. Please try again.")
      }
    } catch (error) {
      console.error("Create bills error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to create bills. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected rental details for display in the combobox trigger
  const selectedRentalForDisplay = useMemo(() => {
    return rentalSearchResults.find((rental) => rental.id === selectedRentalId)
  }, [rentalSearchResults, selectedRentalId])

  // Show loading state during auth check
  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Bill</h1>
        <p className="text-slate-600">Search for a rental agreement and create bills for the tenant</p>
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
            Search for a rental agreement by tenant name, IC number, room name, or property name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Rental Search Combobox */}
            <div className="space-y-2">
              <Label>Select Rental Agreement</Label>
              <Popover open={rentalSearchOpen} onOpenChange={setRentalSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={rentalSearchOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    {selectedRentalForDisplay ? (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedRentalForDisplay.id} - {selectedRentalForDisplay.fullName} (
                          {selectedRentalForDisplay.roomName})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search by tenant name, IC, room name, or property name...</span>
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
                                      {rental.roomName} • {rental.propertyName}
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

      {/* Selected Rental Details */}
      {selectedRental && (
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Rental Agreement Details</span>
            </CardTitle>
            <CardDescription>Selected rental agreement information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Rental ID */}
              <div className="space-y-2">
                <Label>Rental ID</Label>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedRental.id}</span>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedRental.fullName}</span>
                </div>
              </div>

              {/* IC Number */}
              <div className="space-y-2">
                <Label>IC Number</Label>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedRental.nric}</span>
                </div>
              </div>

              {/* Property Name */}
              <div className="space-y-2">
                <Label>Property Name</Label>
                <div className="flex items-center space-x-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedRental.propertyName}</span>
                </div>
              </div>

              {/* Room Number */}
              <div className="space-y-2">
                <Label>Room Number</Label>
                <div className="flex items-center space-x-2">
                  <DoorOpen className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">
                    {selectedRental.roomName} ({selectedRental.roomId})
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Badge {...getStatusBadge(selectedRental.rentalStatus)}>{selectedRental.rentalStatus}</Badge>
                </div>
              </div>

              {/* Tenure Start Date */}
              <div className="space-y-2">
                <Label>Tenure Start Date</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{formatDate(selectedRental.rentalStartDate)}</span>
                </div>
              </div>

              {/* Tenure End Date */}
              <div className="space-y-2">
                <Label>Tenure End Date</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{formatDate(selectedRental.rentalEndDate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Bills Section */}
      {selectedRental && (
        <form onSubmit={handleCreateBills}>
          <Card className="shadow-lg mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Create Bills</span>
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addBill} disabled={isBillTypesLoading}>
                <Plus className="w-4 h-4 mr-2" /> Add Bill
              </Button>
            </CardHeader>
            <CardDescription className="px-6">Create multiple bills for this rental agreement</CardDescription>
            <CardContent className="space-y-4 pt-4">
              {bills.length === 0 && (
                <div className="text-center py-8">
                  <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No bills added yet. Click "Add Bill" to start creating bills.</p>
                </div>
              )}
              {bills.map((bill, index) => (
                <div key={bill.id} className="border rounded-md p-4 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Bill {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeBill(bill.id)}
                    >
                      <X className="w-4 h-4" />
                      <span className="sr-only">Remove Bill</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bill Type */}
                    <div className="space-y-2">
                      <Label htmlFor={`bill-${bill.id}-type`}>Bill Type *</Label>
                      <Select
                        value={bill.billType}
                        onValueChange={(value) => updateBill(bill.id, "billType", value)}
                        disabled={isBillTypesLoading}
                      >
                        <SelectTrigger className={errors[`bill-${bill.id}-billType`] ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select bill type" />
                        </SelectTrigger>
                        <SelectContent>
                          {billTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div>
                                <div className="font-medium">{type.name}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`bill-${bill.id}-billType`] && (
                        <p className="text-sm text-red-500">{errors[`bill-${bill.id}-billType`]}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor={`bill-${bill.id}-amount`}>Amount (MYR) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`bill-${bill.id}-amount`}
                          type="number"
                          step="0.01"
                          placeholder="Enter amount"
                          value={bill.amount}
                          onChange={(e) => updateBill(bill.id, "amount", e.target.value)}
                          className={`pl-10 ${errors[`bill-${bill.id}-amount`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`bill-${bill.id}-amount`] && (
                        <p className="text-sm text-red-500">{errors[`bill-${bill.id}-amount`]}</p>
                      )}
                    </div>

                    {/* Bill Month */}
                    <div className="space-y-2">
                      <Label htmlFor={`bill-${bill.id}-month`}>Bill Month *</Label>
                      <Input
                        id={`bill-${bill.id}-month`}
                        type="month"
                        value={bill.billMonth}
                        onChange={(e) => updateBill(bill.id, "billMonth", e.target.value)}
                        className={errors[`bill-${bill.id}-billMonth`] ? "border-red-500" : ""}
                      />
                      {errors[`bill-${bill.id}-billMonth`] && (
                        <p className="text-sm text-red-500">{errors[`bill-${bill.id}-billMonth`]}</p>
                      )}
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                      <Label htmlFor={`bill-${bill.id}-remarks`}>Remarks</Label>
                      <Textarea
                        id={`bill-${bill.id}-remarks`}
                        placeholder="Enter any additional remarks..."
                        value={bill.remarks}
                        onChange={(e) => updateBill(bill.id, "remarks", e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {bills.length > 0 && (
            <div className="flex justify-end">
              <Button type="submit" className="w-fit h-12 text-lg font-semibold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Bills...
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 mr-2" />
                    Create {bills.length} Bill{bills.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* No Rental Selected State */}
      {!selectedRental && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Receipt className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Rental Agreement Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a rental agreement from the dropdown above to start creating bills.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminDashboardLayout>
  )
}
