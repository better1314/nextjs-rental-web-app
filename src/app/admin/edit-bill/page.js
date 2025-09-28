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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  DoorOpen,
  User,
  CreditCard,
  Receipt,
  Clock,
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

// Helper function to format datetime for display
function formatDateTime(dateString) {
    console.log("tedt"+dateString)
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

// Helper function to get bill status badge
function getBillStatusBadge(status) {
  switch (status?.toUpperCase()) {
    case "CREATED":
      return { variant: "outline", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" }
    case "PAID":
      return { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" }
    case "PENDING":
      return { variant: "secondary", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" }
    case "OVERDUE":
      return { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-100" }
    default:
      return { variant: "outline", className: "" }
  }
}

// Helper function to check if bill is editable
function isBillEditable(bill) {
  return bill.status?.toUpperCase() === "CREATED"
}

export default function EditBillPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingBill, setIsDeletingBill] = useState(false)
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
  const [isBillsLoading, setIsBillsLoading] = useState(false)
  const [originalBills, setOriginalBills] = useState([])

  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [billToDelete, setBillToDelete] = useState(null)

  // Selected rental data
  const [selectedRental, setSelectedRental] = useState(null)

  // Debounced search query
  const debouncedRentalSearch = useDebounce(rentalSearchQuery, 300)

  // Check authorization on component mount
  useEffect(() => {
    const doInit = async () => {
      try {
        setIsLoading(true)
        if (await !sessionUtils.isLoggedIn()) {
          router.push("/login")
          return
        }
        if (await !sessionUtils.isAdmin()) {
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

  // Load bills for selected rental
  const loadBills = async (rentalId) => {
    try {
      setIsBillsLoading(true)
      const result = await billAPI.getBillsByRental(rentalId)
      if (result.success) {
        setBills(result.bills)
        setOriginalBills(JSON.parse(JSON.stringify(result.bills))) // Deep copy
      } else {
        console.error("Failed to load bills:", result.error)
        setApiError("Failed to load bills for this rental agreement.")
        setBills([])
        setOriginalBills([])
      }
    } catch (error) {
      console.error("Error loading bills:", error)
      setApiError("Failed to load bills for this rental agreement.")
      setBills([])
      setOriginalBills([])
    } finally {
      setIsBillsLoading(false)
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

  const handleRentalSelect = async (rentalId) => {
    setSelectedRentalId(rentalId)
    setRentalSearchOpen(false)
    const selectedRentalData = rentalSearchResults.find((rental) => rental.id === rentalId)

    if (selectedRentalData) {
      setSelectedRental(selectedRentalData)
      // Load bills for this rental
      await loadBills(rentalId)
    }

    // Clear any existing messages
    setApiError("")
    setSuccessMessage("")
    setErrors({})
  }

  const updateBill = (billId, field, value) => {
    const bill = bills.find((b) => b.billId === billId)
    if (!bill || !isBillEditable(bill)) {
      return // Don't update if bill is not editable
    }

    setBills((prev) => prev.map((bill) => (bill.billId === billId ? { ...bill, [field]: value } : bill)))

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

  const validateBill = (bill) => {
    const newErrors = {}
    const billKey = `bill-${bill.billId}`

    if (!bill.billType) {
      newErrors[`${billKey}-billType`] = "Bill type is required"
    }
    if (!bill.amount) {
      newErrors[`${billKey}-amount`] = "Amount is required"
    } else if (isNaN(Number(bill.amount)) || Number(bill.amount) <= 0) {
      newErrors[`${billKey}-amount`] = "Amount must be a positive number"
    }
    if (!bill.billMonth) {
      newErrors[`${billKey}-billMonth`] = "Bill month is required"
    }

    return newErrors
  }

  const handleUpdateBill = async (bill) => {
    const billErrors = validateBill(bill)
    if (Object.keys(billErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...billErrors }))
      setApiError("Please correct the errors in the bill form.")
      return
    }

    setIsSubmitting(true)
    setApiError("")
    setSuccessMessage("")

    try {
      const billData = {
        billType: bill.billType,
        amount: Number.parseFloat(bill.amount),
        billMonth: bill.billMonth,
        remarks: bill.remarks?.trim() || "",
      }

      const result = await billAPI.updateBill(bill.billId, billData)

      if (result.success) {
        setSuccessMessage(result.message)
        // Update original bills to reflect changes
        setOriginalBills((prev) => prev.map((b) => (b.billId === bill.billId ? { ...bill } : b)))
      } else {
        setApiError(result.message || "Failed to update bill. Please try again.")
      }
    } catch (error) {
      console.error("Update bill error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update bill. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBill = async () => {
    if (!billToDelete) return

    setIsDeletingBill(true)
    setApiError("")
    setSuccessMessage("")

    try {
      const result = await billAPI.deleteBill(billToDelete.billId)

      if (result.success) {
        setSuccessMessage(result.message)
        // Remove bill from both current and original bills
        setBills((prev) => prev.filter((bill) => bill.billId !== billToDelete.billId))
        setOriginalBills((prev) => prev.filter((bill) => bill.billId !== billToDelete.billId))
        setShowDeleteDialog(false)
        setBillToDelete(null)
      } else {
        setApiError(result.message || "Failed to delete bill. Please try again.")
      }
    } catch (error) {
      console.error("Delete bill error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to delete bill. Please try again.")
      }
    } finally {
      setIsDeletingBill(false)
    }
  }

  const openDeleteDialog = (bill) => {
    if (!isBillEditable(bill)) {
      setApiError(`Cannot delete bill with status "${bill.status}". Only bills with "CREATED" status can be deleted.`)
      return
    }
    setBillToDelete(bill)
    setShowDeleteDialog(true)
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setBillToDelete(null)
  }

  // Get selected rental details for display in the combobox trigger
  const selectedRentalForDisplay = useMemo(() => {
    return rentalSearchResults.find((rental) => rental.id === selectedRentalId)
  }, [rentalSearchResults, selectedRentalId])

  // Check if a bill has changes
  const billHasChanges = (bill) => {
    const originalBill = originalBills.find((b) => b.billId === bill.billId)
    if (!originalBill) return false
    return JSON.stringify(bill) !== JSON.stringify(originalBill)
  }

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Bill</h1>
        <p className="text-slate-600">Search for a rental agreement and edit existing bills</p>
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

      {/* Existing Bills Section */}
      {selectedRental && (
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Existing Bills</span>
            </CardTitle>
            <CardDescription>Edit existing bills for this rental agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isBillsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
                <span className="text-slate-600">Loading bills...</span>
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No bills found for this rental agreement.</p>
              </div>
            ) : (
              bills.map((bill) => {
                const isEditable = isBillEditable(bill)

                return (
                  <div key={bill.billId} className="border rounded-md p-4 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-slate-800">Bill {bill.billId}</h4>
                        <Badge {...getBillStatusBadge(bill.status)} size="sm">
                          {bill.status}
                        </Badge>
                        {!isEditable && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Read Only
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {billHasChanges(bill) && isEditable && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUpdateBill(bill)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`${isEditable ? "text-red-500 hover:bg-red-50 hover:text-red-600" : "text-gray-400 cursor-not-allowed hover:bg-transparent hover:text-gray-400"}`}
                          onClick={() => openDeleteDialog(bill)}
                          disabled={isDeletingBill || !isEditable}
                          title={!isEditable ? `Cannot delete bill with status "${bill.status}"` : "Delete bill"}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete Bill</span>
                        </Button>
                      </div>
                    </div>

                    {/* Status Information */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>Created on {formatDateTime(bill.createdOn)}</span>
                      </div>
                      {!isEditable && (
                        <div className="text-amber-600 text-sm font-medium">
                          ⚠️ Only bills with "CREATED" status can be edited
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {/* Bill ID (Read-only) */}
                      <div className="space-y-2">
                        <Label htmlFor={`bill-${bill.billId}-id`}>Bill ID</Label>
                        <div className="relative">
                          <Receipt className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id={`bill-${bill.billId}-id`}
                            type="text"
                            value={bill.billId}
                            readOnly
                            className="pl-10 bg-slate-100 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-slate-500">This field cannot be edited</p>
                      </div>

                      {/* Bill Type */}
                      <div className="space-y-2">
                        <Label htmlFor={`bill-${bill.billId}-type`}>Bill Type *</Label>
                        <Select
                          value={bill.billType}
                          onValueChange={(value) => updateBill(bill.billId, "billType", value)}
                          disabled={isBillTypesLoading || !isEditable}
                        >
                          <SelectTrigger
                            className={`${errors[`bill-${bill.billId}-billType`] ? "border-red-500" : ""} ${
                              !isEditable ? "bg-slate-100 cursor-not-allowed" : ""
                            }`}
                          >
                            <SelectValue placeholder="Select bill type" />
                          </SelectTrigger>
                          <SelectContent>
                            {billTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                <div>
                                  <div className="font-medium">{type.name}</div>
                                  <div className="text-sm text-slate-500">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors[`bill-${bill.billId}-billType`] && (
                          <p className="text-sm text-red-500">{errors[`bill-${bill.billId}-billType`]}</p>
                        )}
                        {!isEditable && <p className="text-xs text-slate-500">This field cannot be edited</p>}
                      </div>

                      {/* Bill Month */}
                      <div className="space-y-2">
                        <Label htmlFor={`bill-${bill.billId}-month`}>Bill Month *</Label>
                        <Input
                          id={`bill-${bill.billId}-month`}
                          type="month"
                          value={bill.billMonth}
                          onChange={(e) => updateBill(bill.billId, "billMonth", e.target.value)}
                          className={`${errors[`bill-${bill.billId}-billMonth`] ? "border-red-500" : ""} ${
                            !isEditable ? "bg-slate-100 cursor-not-allowed" : ""
                          }`}
                          readOnly={!isEditable}
                        />
                        {errors[`bill-${bill.billId}-billMonth`] && (
                          <p className="text-sm text-red-500">{errors[`bill-${bill.billId}-billMonth`]}</p>
                        )}
                        {!isEditable && <p className="text-xs text-slate-500">This field cannot be edited</p>}
                      </div>

                      {/* Amount */}
                      <div className="space-y-2">
                        <Label htmlFor={`bill-${bill.billId}-amount`}>Amount (MYR) *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id={`bill-${bill.billId}-amount`}
                            type="number"
                            step="0.01"
                            placeholder="Enter amount"
                            value={bill.amount}
                            onChange={(e) => updateBill(bill.billId, "amount", e.target.value)}
                            className={`pl-10 ${errors[`bill-${bill.billId}-amount`] ? "border-red-500" : ""} ${
                              !isEditable ? "bg-slate-100 cursor-not-allowed" : ""
                            }`}
                            readOnly={!isEditable}
                          />
                        </div>
                        {errors[`bill-${bill.billId}-amount`] && (
                          <p className="text-sm text-red-500">{errors[`bill-${bill.billId}-amount`]}</p>
                        )}
                        {!isEditable && <p className="text-xs text-slate-500">This field cannot be edited</p>}
                      </div>

                      {/* Remarks */}
                      <div className="space-y-2">
                        <Label htmlFor={`bill-${bill.billId}-remarks`}>Remarks</Label>
                        <Textarea
                          id={`bill-${bill.billId}-remarks`}
                          placeholder="Enter any additional remarks..."
                          value={bill.remarks || ""}
                          onChange={(e) => updateBill(bill.billId, "remarks", e.target.value)}
                          className={`resize-none ${!isEditable ? "bg-slate-100 cursor-not-allowed" : ""}`}
                          rows={2}
                          readOnly={!isEditable}
                        />
                        {!isEditable && <p className="text-xs text-slate-500">This field cannot be edited</p>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* No Rental Selected State */}
      {!selectedRental && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Receipt className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Rental Agreement Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a rental agreement from the dropdown above to view and edit its bills.
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
              <span>Delete Bill</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete bill "{billToDelete?.billId}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {billToDelete && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Bill ID:</span>
                  <span className="text-sm">{billToDelete.billId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm">{billToDelete.billTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm">{formatCurrency(billToDelete.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Month:</span>
                  <span className="text-sm">{billToDelete.billMonth}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeletingBill}
              className="w-full sm:w-auto bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteBill}
              disabled={isDeletingBill}
              className="w-full sm:w-auto"
            >
              {isDeletingBill ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
