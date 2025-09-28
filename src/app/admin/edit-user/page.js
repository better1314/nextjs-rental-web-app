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
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  ChevronsUpDown,
  RefreshCw,
  UserX,
  Save,
} from "lucide-react"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { userAPI } from "@/common/api"
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

export default function EditUserPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInactivating, setIsInactivating] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errors, setErrors] = useState({})

  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userSearchResults, setUserSearchResults] = useState([])
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [userPage, setUserPage] = useState(1)
  const [userHasMore, setUserHasMore] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState("")

  // Form data state
  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    dateOfBirth: "",
    nric: "",
    email: "",
    statusCode: "",
    roleCode: "",
    contactNo: "",
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState({})

  // Debounced search query
  const debouncedUserSearch = useDebounce(userSearchQuery, 300)


  // NRIC validation regex (Singapore format)
  const nricRegex = /^\d{6}-\d{2}-\d{4}$/
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

  // Search users with server-side filtering and pagination
  const searchUsers = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsUserSearchLoading(true)

      const result = await userAPI.searchUsers(query, page, 20, "AL")

      if (result.success) {
        if (reset || page === 1) {
          setUserSearchResults(result.users)
        } else {
          setUserSearchResults((prev) => [...prev, ...result.users])
        }

        setUserHasMore(result.hasMore)
        setUserPage(result.page)

        console.log(`Loaded ${result.users.length} users, Total: ${result.totalCount}, Has More: ${result.hasMore}`)
      } else {
        console.error("User search failed:", result.error)

        if (reset || page === 1) {
          setUserSearchResults([])
          setUserHasMore(false)
        }
      }
    } catch (error) {
      console.error("Unexpected error in searchUsers:", error)

      if (reset || page === 1) {
        setUserSearchResults([])
        setUserHasMore(false)
      }
    } finally {
      setIsUserSearchLoading(false)
    }
  }, [])

  // Effect for debounced user search
  useEffect(() => {
    if (userSearchOpen) {
      searchUsers(debouncedUserSearch, 1, true)
    }
  }, [debouncedUserSearch, userSearchOpen, searchUsers])

  // Load more users (infinite scroll)
  const loadMoreUsers = useCallback(() => {
    if (userHasMore && !isUserSearchLoading) {
      searchUsers(debouncedUserSearch, userPage + 1, false)
    }
  }, [userHasMore, isUserSearchLoading, debouncedUserSearch, userPage, searchUsers])

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId)
    setUserSearchOpen(false)
    const selectedUserData = userSearchResults.find((user) => user.id === userId)

    if (selectedUserData) {
      const userData = {
        userId: selectedUserData.id,
        fullName: selectedUserData.fullName || "",
        dateOfBirth: selectedUserData.dateOfBirth || "",
        nric: selectedUserData.nric || "",
        email: selectedUserData.email || "",
        statusCode: selectedUserData.statusCode || "",
        roleCode: selectedUserData.roleCode || "",
        contactNo: selectedUserData.contactNumber || "",
      }

    setFormData(userData)
    setOriginalData(userData)
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

    // Date of Birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required"
    } else {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 18) {
        newErrors.dateOfBirth = "User must be at least 18 years old"
      }
    }

    // NRIC validation
    if (!formData.nric) {
      newErrors.nric = "NRIC is required"
    } else if (!nricRegex.test(formData.nric.toUpperCase())) {
      newErrors.nric = "Please enter a valid NRIC (e.g., 111111-11-1111)"
    }

    // Contact Number validation
    if (!formData.contactNo) {
      newErrors.contactNo = "Contact number is required"
    } else if (!phoneRegex.test(formData.contactNo)) {
      newErrors.contactNo = "Please enter a valid contact number"
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
      await fetcher("/user/editUser", {
              body: JSON.stringify({
                user : {
                    userId : formData.userId,
                    fullName: formData.fullName.trim(),
                    dateOfBirth: formData.dateOfBirth,
                    nric: formData.nric.toUpperCase(),
                    statusCode: formData.statusCode,
                    roleCode: formData.roleCode,
                    contactNo: formData.contactNo,
                }
              })
            })

      setSuccessMessage("User details updated successfully!")

      // Update original data to reflect changes
      setOriginalData({ ...formData })
    } catch (error) {
      console.error("Update user error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update user detail. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleUserStatus = async () => {
    if (!formData.userId) {
      setApiError("No user selected")
      return
    }

    const isCurrentlyInactive = formData.statusCode === "I"
    const action = isCurrentlyInactive ? "active" : "inactive"
    const newStatus = isCurrentlyInactive ? "AT" : "IA"

    const confirmMessage = isCurrentlyInactive
      ? `Are you sure you want to activate user "${formData.fullName}"?`
      : `Are you sure you want to inactive user "${formData.fullName}"? This action will prevent them from logging in.`

    const confirmAction = window.confirm(confirmMessage)

    if (!confirmAction) {
      return
    }

    setIsInactivating(true)
    setApiError("")
    setSuccessMessage("")

    try {
      const statusData = {
        userId: formData.userId,
        newStatus: newStatus,
      }

      await fetcher("/user/updateUserStatus", {
        body : JSON.stringify({
            userId : formData.userId,
            mode : newStatus,
        })
      })
      setSuccessMessage(`User "${formData.fullName}" has been ${action}d successfully!`)

      // Update status
      setFormData((prev) => ({ ...prev, statusCode: newStatus }))
      setOriginalData((prev) => ({ ...prev, statusCode: newStatus }))
    } catch (error) {
      console.error(`${action} user error:`, error)

      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update user status. Please try again.")
      }
    } finally {
      setIsInactivating(false)
    }
  }

  // Get selected user details for display
  const selectedUser = useMemo(() => {
    return userSearchResults.find((user) => user.id === selectedUserId)
  }, [userSearchResults, selectedUserId])

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Show loading state during auth check
  if (isLoading && !formData.userId) {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit User</h1>
        <p className="text-slate-600">Search and edit user details or inactive users</p>
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

      {/* User Search Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search User</span>
          </CardTitle>
          <CardDescription>Search for a user by name, email, or NRIC to edit their details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User Search Combobox */}
            <div className="space-y-2">
              <Label>Select User to Edit</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    {selectedUser ? (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedUser.fullName} ({selectedUser.email})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search users by name, email, or NRIC...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onValueChange={setUserSearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className="h-[300px]">
                        {isUserSearchLoading && userSearchResults.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-slate-500">Searching users...</span>
                          </div>
                        ) : userSearchResults.length === 0 ? (
                          <CommandEmpty>No users found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {userSearchResults.map((user) => (
                              <CommandItem key={user.id} value={user.id} onSelect={() => handleUserSelect(user.id)}>
                                <div className="flex items-center space-x-3 w-full">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedUserId === user.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{user.fullName || "N/A"}</div>
                                    <div className="text-sm text-slate-500">
                                      {user.email || "No email"} • {user.nric || "No NRIC"}
                                    </div>
                                    <div className="text-sm text-slate-400">{user.contactNumber || "No contact"}</div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                            {userHasMore && (
                              <div className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadMoreUsers}
                                  disabled={isUserSearchLoading}
                                  className="w-full"
                                >
                                  {isUserSearchLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Load more users
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

      {/* User Details Form */}
      {formData.userId && (
        <form onSubmit={handleUpdate}>
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCog className="w-5 h-5" />
                <span>User Details</span>
              </CardTitle>
              <CardDescription>Edit user information (User ID and Email cannot be changed)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User ID (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="userId"
                      name="userId"
                      type="text"
                      value={formData.userId}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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

                {/* NRIC */}
                <div className="space-y-2">
                  <Label htmlFor="nric">NRIC</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="nric"
                      name="nric"
                      type="text"
                      placeholder="e.g., 111111-11-1111"
                      value={formData.nric}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.nric ? "border-red-500" : ""}`}
                      maxLength={15}
                    />
                  </div>
                  {errors.nric && <p className="text-sm text-red-500">{errors.nric}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.dateOfBirth ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth}</p>}
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

                {/* Status Code (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="statusCode">Status Code</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="statusCode"
                      name="statusCode"
                      type="text"
                      value={
                        formData.statusCode === "A"
                          ? "A - Active"
                          : formData.statusCode === "I"
                            ? "I - Inactive"
                            : formData.statusCode === "S"
                              ? "S - Suspended"
                              : formData.statusCode
                      }
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>

                {/* Role Code (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="roleCode">Role Code</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="roleCode"
                      name="roleCode"
                      type="text"
                      value={
                        formData.roleCode === "A"
                          ? "A - Admin"
                          : formData.roleCode === "N"
                            ? "N - Normal User"
                            : formData.roleCode
                      }
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update User
                </>
              )}
            </Button>
            <Button
              type="button"
              variant={formData.statusCode === "I" ? "default" : "destructive"}
              className="flex-1"
              onClick={handleToggleUserStatus}
              disabled={isInactivating}
            >
              {isInactivating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {formData.statusCode === "I" ? "Activating..." : "Inactivating..."}
                </>
              ) : (
                <>
                  {formData.statusCode === "I" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Active This User
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Inactive This User
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* No User Selected State */}
      {!formData.userId && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <UserCog className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No User Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a user from the dropdown above to view and edit their details.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminDashboardLayout>
  )
}
