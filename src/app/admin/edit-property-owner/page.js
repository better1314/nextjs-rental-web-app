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

import {
  UserCog,
  User,
  Search,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Save,
} from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { propertyAPI } from "@/common/api"
import { fetcher } from "@/common/webclient" 

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

export default function EditPropertyOwnerPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errors, setErrors] = useState({})

  // Owner search states
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("")
  const [ownerSearchResults, setOwnerSearchResults] = useState([])
  const [isOwnerSearchLoading, setIsOwnerSearchLoading] = useState(false)
  const [ownerSearchOpen, setOwnerSearchOpen] = useState(false)
  const [ownerPage, setOwnerPage] = useState(1)
  const [ownerHasMore, setOwnerHasMore] = useState(true)
  const [selectedOwnerId, setSelectedOwnerId] = useState("")

  // Form data state
  const [formData, setFormData] = useState({
    ownerId: "",
    fullName: "",
    contactNo: "",
    email: "",
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState({})

  // Debounced search query
  const debouncedOwnerSearch = useDebounce(ownerSearchQuery, 300)

  // Phone number regex (basic format)
  const phoneRegex = /^[+]?[\d\s\-()]{8,15}$/

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
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    doInit()
  }, [router])

  // Search owners with server-side filtering and pagination
  const searchOwners = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsOwnerSearchLoading(true)
      const result = await propertyAPI.searchOwners(query, page, 20)

      if (result.success) {
        if (reset || page === 1) {
          setOwnerSearchResults(result.owners)
        } else {
          setOwnerSearchResults((prev) => [...prev, ...result.owners])
        }
        setOwnerHasMore(result.hasMore)
        setOwnerPage(result.page)
        console.log(`Loaded ${result.owners.length} owners, Total: ${result.totalCount}, Has More: ${result.hasMore}`)
      } else {
        console.error("Owner search failed:", result.error)
        if (reset || page === 1) {
          setOwnerSearchResults([])
          setOwnerHasMore(false)
        }
      }
    } catch (error) {
      console.error("Unexpected error in searchOwners:", error)
      if (reset || page === 1) {
        setOwnerSearchResults([])
        setOwnerHasMore(false)
      }
    } finally {
      setIsOwnerSearchLoading(false)
    }
  }, [])

  // Effect for debounced owner search
  useEffect(() => {
    if (ownerSearchOpen) {
      searchOwners(debouncedOwnerSearch, 1, true)
    }
  }, [debouncedOwnerSearch, ownerSearchOpen, searchOwners])

  // Load more owners (infinite scroll)
  const loadMoreOwners = useCallback(() => {
    if (ownerHasMore && !isOwnerSearchLoading) {
      searchOwners(debouncedOwnerSearch, ownerPage + 1, false)
    }
  }, [ownerHasMore, isOwnerSearchLoading, debouncedOwnerSearch, ownerPage, searchOwners])

  const handleOwnerSelect = (ownerId) => {
    setSelectedOwnerId(ownerId)
    setOwnerSearchOpen(false)
    const selectedOwnerData = ownerSearchResults.find((owner) => owner.ownerId === ownerId)

    if (selectedOwnerData) {
      const ownerData = {
        ownerId: selectedOwnerData.ownerId,
        fullName: selectedOwnerData.fullName || "",
        contactNo: selectedOwnerData.contactNo || "",
        email: selectedOwnerData.email || "",

      }
      setFormData(ownerData)
      setOriginalData(ownerData)
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

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters"
    }

    // Contact Number validation
    if (!formData.contactNo) {
      newErrors.contactNo = "Contact number is required"
    } else if (!phoneRegex.test(formData.contactNo)) {
      newErrors.contactNo = "Please enter a valid contact number"
    }

    // Email validation (basic)
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdate = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setApiError("")
    setSuccessMessage("")

    try {
      await fetcher("/property/editPropertyOwner", {
        body: JSON.stringify({
          propertyOwnerDetails: {
            ownerId: formData.ownerId,
            fullName: formData.fullName.trim(),
            contactNo: formData.contactNo,
            email: formData.email,
          },
        }),
      })

      setSuccessMessage("Property owner details updated successfully!")
      // Update original data to reflect changes
      setOriginalData({ ...formData })
    } catch (error) {
      console.error("Update owner error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update property owner detail. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected owner details for display in the combobox trigger
  const selectedOwner = useMemo(() => {
    return ownerSearchResults.find((owner) => owner.ownerId === selectedOwnerId)
  }, [ownerSearchResults, selectedOwnerId])

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Show loading state during auth check
  if (isLoading && !formData.ownerId) {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Property Owner</h1>
        <p className="text-slate-600">Search and edit property owner details or inactive owners</p>
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

      {/* Owner Search Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Property Owner</span>
          </CardTitle>
          <CardDescription>
            Search for a property owner by name, email, or contact number to edit their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Owner Search Combobox */}
            <div className="space-y-2">
              <Label>Select Property Owner to Edit</Label>
              <Popover open={ownerSearchOpen} onOpenChange={setOwnerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ownerSearchOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    {selectedOwner ? (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedOwner.fullName} ({selectedOwner.ownerId})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search owners by name, email, or contact number...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search owners..."
                      value={ownerSearchQuery}
                      onValueChange={setOwnerSearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className="h-[300px]">
                        {isOwnerSearchLoading && ownerSearchResults.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-slate-500">Searching owners...</span>
                          </div>
                        ) : ownerSearchResults.length === 0 ? (
                          <CommandEmpty>No owners found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {ownerSearchResults.map((owner) => (
                              <CommandItem key={owner.ownerId} value={owner.ownerId} onSelect={() => handleOwnerSelect(owner.ownerId)}>
                                <div className="flex items-center space-x-3 w-full">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedOwnerId === owner.ownerId ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{owner.fullName || "N/A"}</div>
                                    <div className="text-sm text-slate-500">
                                      {owner.email || "No email"} • {owner.contactNo || "No contact"}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                            {ownerHasMore && (
                              <div className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadMoreOwners}
                                  disabled={isOwnerSearchLoading}
                                  className="w-full"
                                >
                                  {isOwnerSearchLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Load more owners
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

      {/* Owner Details Form */}
      {formData.ownerId && (
        <form onSubmit={handleUpdate}>
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCog className="w-5 h-5" />
                <span>Property Owner Details</span>
              </CardTitle>
              <CardDescription>Edit property owner information (Owner ID cannot be changed)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner ID (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Owner ID</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ownerId"
                      name="ownerId"
                      type="text"
                      value={formData.ownerId}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Enter full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.fullName ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNo">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="contactNo"
                      name="contactNo"
                      type="tel"
                      placeholder="e.g., +65 9123 4567"
                      value={formData.contactNo}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.contactNo ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.contactNo && <p className="text-sm text-red-500">{errors.contactNo}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter owner's email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Button type="submit" className="w-fit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Property Owner
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* No Owner Selected State */}
      {!formData.ownerId && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <UserCog className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Property Owner Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a property owner from the dropdown above to view and edit their details.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminDashboardLayout>
  )
}
