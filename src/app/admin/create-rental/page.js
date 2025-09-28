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
  FileText,
  User,
  Search,
  Home,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  ChevronsUpDown,
  MapPin,
  RefreshCw,
} from "lucide-react"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { userAPI, propertyAPI} from "@/common/api"
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

export default function CreateRentalPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Property/Room search states
  const [propertySearchQuery, setPropertySearchQuery] = useState("")
  const [propertySearchResults, setPropertySearchResults] = useState([])
  const [isPropertySearchLoading, setIsPropertySearchLoading] = useState(false)
  const [roomSearchOpen, setRoomSearchOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [roomPage, setRoomPage] = useState(1)
  const [roomHasMore, setRoomHasMore] = useState(true)

  // Form data state
  const [formData, setFormData] = useState({
    userId: "",
    roomId: "",
    rentalStartDate: "",
    rentalEndDate: "",
    monthlyTenureFee: "",
  })

  // Debounced search queries
  const debouncedUserSearch = useDebounce(userSearchQuery, 300)
  const debouncedPropertySearch = useDebounce(propertySearchQuery, 300)

  // Check authorization on component mount
  useEffect(() => {
    const checkAuth = async () => {
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

    checkAuth()
  }, [router])

  // Search users with server-side filtering and pagination
  const searchUsers = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsUserSearchLoading(true)

      const result = await userAPI.searchUsers(query, page, 20, "OA")

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

  // Search properties/rooms with server-side filtering and pagination
  const searchRooms = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsPropertySearchLoading(true)

      const result = await propertyAPI.searchAvailableRooms(query, page, 20)
      console.log("Search Rooms Result:", result)

      if (result.success) {
        if (reset || page === 1) {
          setPropertySearchResults(result.rooms)
        } else {
          setPropertySearchResults((prev) => [...prev, ...result.rooms])
        }

        setRoomHasMore(result.hasMore)
        setRoomPage(result.page)

        console.log(`Loaded ${result.rooms.length} rooms, Total: ${result.totalCount}, Has More: ${result.hasMore}`)
      } else {
        console.error("Room search failed:", result.error)

        if (reset || page === 1) {
          setPropertySearchResults([])
          setRoomHasMore(false)
        }
      }
    } catch (error) {
      console.error("Unexpected error in searchRooms:", error)

      if (reset || page === 1) {
        setPropertySearchResults([])
        setRoomHasMore(false)
      }
    } finally {
      setIsPropertySearchLoading(false)
    }
  }, [])

  // Effect for debounced user search
  useEffect(() => {
    if (userSearchOpen) {
      searchUsers(debouncedUserSearch, 1, true)
    }
  }, [debouncedUserSearch, userSearchOpen, searchUsers])

  // Effect for debounced room search
  useEffect(() => {
    if (roomSearchOpen) {
      searchRooms(debouncedPropertySearch, 1, true)
    }
  }, [debouncedPropertySearch, roomSearchOpen, searchRooms])

  // Load more users (infinite scroll)
  const loadMoreUsers = useCallback(() => {
    if (userHasMore && !isUserSearchLoading) {
      searchUsers(debouncedUserSearch, userPage + 1, false)
    }
  }, [userHasMore, isUserSearchLoading, debouncedUserSearch, userPage, searchUsers])

  // Load more rooms (infinite scroll)
  const loadMoreRooms = useCallback(() => {
    if (roomHasMore && !isPropertySearchLoading) {
      searchRooms(debouncedPropertySearch, roomPage + 1, false)
    }
  }, [roomHasMore, isPropertySearchLoading, debouncedPropertySearch, roomPage, searchRooms])

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

  const handleUserSelect = (userId) => {
    setFormData((prev) => ({ ...prev, userId }))
    setUserSearchOpen(false)

    // Clear user error
    if (errors.userId) {
      setErrors((prev) => ({ ...prev, userId: "" }))
    }
  }

  const handleRoomSelect = (roomId) => {
    setFormData((prev) => ({ ...prev, roomId }))
    setRoomSearchOpen(false)

    // Clear room error
    if (errors.roomId) {
      setErrors((prev) => ({ ...prev, roomId: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.userId) {
      newErrors.userId = "Please select a user"
    }

    if (!formData.roomId) {
      newErrors.roomId = "Please select an available room"
    }

    if (!formData.rentalStartDate) {
      newErrors.rentalStartDate = "Rental start date is required"
    }

    if (!formData.rentalEndDate) {
      newErrors.rentalEndDate = "Rental end date is required"
    } else if (formData.rentalStartDate && formData.rentalEndDate <= formData.rentalStartDate) {
      newErrors.rentalEndDate = "Rental end date must be after start date"
    }

    if (!formData.monthlyTenureFee) {
      newErrors.monthlyTenureFee = "Monthly tenure fee is required"
    } else if (isNaN(formData.monthlyTenureFee) || Number.parseFloat(formData.monthlyTenureFee) <= 0) {
      newErrors.monthlyTenureFee = "Please enter a valid amount"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setApiError("")
    setSuccessMessage("")

    try {
      const submitData = {
        userId: formData.userId,
        roomId: formData.roomId,
        rentalStartDate: formData.rentalStartDate,
        rentalEndDate: formData.rentalEndDate,
        monthlyTenureFee: Number.parseFloat(formData.monthlyTenureFee),
      }

      console.log("Submitting rental data:", submitData)

      const rentalResponse = await fetcher("http://localhost:8081/rental/createRental", {
              body: JSON.stringify({
                userId: formData.userId,
                roomId: formData.roomId,
                rentalStartDate: formData.rentalStartDate,
                rentalEndDate: formData.rentalEndDate,
                monthlyAmount: Number.parseFloat(formData.monthlyTenureFee),
              }),
            })

        console.log("Rental created successfully:", rentalResponse)
        setSuccessMessage("Rental agreement created successfully!")

        // Reset form
        setFormData({
          userId: "",
          roomId: "",
          rentalStartDate: "",
          rentalEndDate: "",
          monthlyTenureFee: "",
        })
        setSelectedProperty("")
    } catch (error) {
      console.error("Unexpected error in handleSubmit:", error)

      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to create rental. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearForm = () => {
    setFormData({
      userId: "",
      roomId: "",
      rentalStartDate: "",
      rentalEndDate: "",
      monthlyTenureFee: "",
    })
    setSelectedProperty("")
    setErrors({})
    setApiError("")
    setSuccessMessage("")
  }

  // Get selected user details for display
  const selectedUser = useMemo(() => {
    return userSearchResults.find((user) => user.id === formData.userId)
  }, [userSearchResults, formData.userId])

  // Get selected room details for display
  const selectedRoom = useMemo(() => {
    return propertySearchResults.find((room) => room.roomId === formData.roomId)
  }, [propertySearchResults, formData.roomId])

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Rental</h1>
        <p className="text-slate-600">Create a rental agreement between a user and an available room</p>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* User Selection Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Select User</span>
            </CardTitle>
            <CardDescription>Search and choose the user who will be renting the room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search Combobox */}
            <div className="space-y-2">
              <Label>User</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className={`w-full justify-between ${errors.userId ? "border-red-500" : ""}`}
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
                                      formData.userId === user.id ? "opacity-100" : "opacity-0",
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
              {errors.userId && <p className="text-sm text-red-500">{errors.userId}</p>}
            </div>

            {/* Selected User Details */}
            {selectedUser && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Selected User Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Name:</span>
                    <span className="ml-2 text-blue-800">{selectedUser.fullName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">NRIC:</span>
                    <span className="ml-2 text-blue-800">{selectedUser.nric || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Email:</span>
                    <span className="ml-2 text-blue-800">{selectedUser.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Contact:</span>
                    <span className="ml-2 text-blue-800">{selectedUser.contactNumber || "N/A"}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room Selection Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="w-5 h-5" />
              <span>Select Room</span>
            </CardTitle>
            <CardDescription>Search and choose an available room from the properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room Search Combobox */}
            <div className="space-y-2">
              <Label>Available Room</Label>
              <Popover open={roomSearchOpen} onOpenChange={setRoomSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={roomSearchOpen}
                    className={`w-full justify-between ${errors.roomId ? "border-red-500" : ""}`}
                  >
                    {selectedRoom ? (
                      <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedRoom.propertyName} - {selectedRoom.roomId} ({selectedRoom.roomName})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search available rooms by property, room ID, or name...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search rooms..."
                      value={propertySearchQuery}
                      onValueChange={setPropertySearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className="h-[300px]">
                        {isPropertySearchLoading && propertySearchResults.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-slate-500">Searching rooms...</span>
                          </div>
                        ) : propertySearchResults.length === 0 ? (
                          <CommandEmpty>No available rooms found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {propertySearchResults.map((room) => (
                              <CommandItem key={room.roomId} value={room.roomId} onSelect={() => handleRoomSelect(room.roomId)}>
                                <div className="flex items-center space-x-3 w-full">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.roomId === room.roomId ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {room.propertyName} - {room.roomId} ({room.roomName})
                                    </div>
                                    <div className="text-sm text-slate-500 flex items-center">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {room.propertyAddress}
                                    </div>
                                  </div>
                                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Available</div>
                                </div>
                              </CommandItem>
                            ))}
                            {roomHasMore && (
                              <div className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadMoreRooms}
                                  disabled={isPropertySearchLoading}
                                  className="w-full"
                                >
                                  {isPropertySearchLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Load more rooms
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
              {errors.roomId && <p className="text-sm text-red-500">{errors.roomId}</p>}
            </div>

            {/* Selected Room Details */}
            {selectedRoom && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Selected Room Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Property:</span>
                    <span className="ml-2 text-green-800">{selectedRoom.propertyName}</span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Room:</span>
                    <span className="ml-2 text-green-800">
                      {selectedRoom.roomId} - {selectedRoom.roomName}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Address:</span>
                    <span className="ml-2 text-green-800">{selectedRoom.propertyAddress}</span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Status:</span>
                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Available</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rental Details Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Rental Details</span>
            </CardTitle>
            <CardDescription>Set the rental period and monthly fee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

              {/* Monthly Tenure Fee */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="monthlyTenureFee">Monthly Tenure Fee (MYR)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="monthlyTenureFee"
                    name="monthlyTenureFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 2500.00"
                    value={formData.monthlyTenureFee}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.monthlyTenureFee ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.monthlyTenureFee && <p className="text-sm text-red-500">{errors.monthlyTenureFee}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Rental...
              </>
            ) : (
              "Create Rental Agreement"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={handleClearForm}
            disabled={isSubmitting}
          >
            Clear Form
          </Button>
        </div>
      </form>
    </AdminDashboardLayout>
  )
}
