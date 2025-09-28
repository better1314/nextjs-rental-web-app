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
  Home,
  MapPin,
  Calendar,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  DoorOpen,
  Users,
  XCircle,
} from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { cn } from "@/lib/utils"
import { propertyAPI } from "@/common/api" // New API for property details
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

export default function EditPropertyPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingProperty, setIsDeletingProperty] = useState(false) // New state for property deletion
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errors, setErrors] = useState({})

  // Property search states
  const [propertySearchQuery, setPropertySearchQuery] = useState("")
  const [propertySearchResults, setPropertySearchResults] = useState([])
  const [isPropertySearchLoading, setIsPropertySearchLoading] = useState(false)
  const [propertySearchOpen, setPropertySearchOpen] = useState(false)
  const [propertyPage, setPropertyPage] = useState(1)
  const [propertyHasMore, setPropertyHasMore] = useState(true)
  const [selectedPropertyId, setSelectedPropertyId] = useState("")

  // Form data state
  const [formData, setFormData] = useState({
    propertyId: "",
    propertyName: "",
    propertyAddress: "",
    tenureStartDate: "",
    tenureEndDate: "",
    occupied: false, // New field for property occupancy
    rooms: [], // Array to hold room details
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState({})

  // Debounced search query
  const debouncedPropertySearch = useDebounce(propertySearchQuery, 300)

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

  // Search properties with server-side filtering and pagination
  const searchProperties = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsPropertySearchLoading(true)
      const result = await propertyAPI.searchProperties(query, page, 20) // Using propertyAPI
      if (result.success) {
        if (reset || page === 1) {
          setPropertySearchResults(result.properties)
        } else {
          setPropertySearchResults((prev) => [...prev, ...result.properties])
        }
        setPropertyHasMore(result.hasMore)
        setPropertyPage(result.page)
        console.log(
          `Loaded ${result.properties.length} properties, Total: ${result.totalCount}, Has More: ${result.hasMore}`,
        )
      } else {
        console.error("Property search failed:", result.error)
        if (reset || page === 1) {
          setPropertySearchResults([])
          setPropertyHasMore(false)
        }
      }
    } catch (error) {
      console.error("Unexpected error in searchProperties:", error)
      if (reset || page === 1) {
        setPropertySearchResults([])
        setPropertyHasMore(false)
      }
    } finally {
      setIsPropertySearchLoading(false)
    }
  }, [])

  // Effect for debounced property search
  useEffect(() => {
    if (propertySearchOpen) {
      searchProperties(debouncedPropertySearch, 1, true)
    }
  }, [debouncedPropertySearch, propertySearchOpen, searchProperties])

  // Load more properties (infinite scroll)
  const loadMoreProperties = useCallback(() => {
    if (propertyHasMore && !isPropertySearchLoading) {
      searchProperties(debouncedPropertySearch, propertyPage + 1, false)
    }
  }, [propertyHasMore, isPropertySearchLoading, debouncedPropertySearch, propertyPage, searchProperties])

  const handlePropertySelect = (propertyId) => {
    setSelectedPropertyId(propertyId)
    setPropertySearchOpen(false)
    const selectedPropertyData = propertySearchResults.find((property) => property.propertyId === propertyId)

    if (selectedPropertyData) {
      const propertyData = {
        propertyId: selectedPropertyData.propertyId,
        propertyName: selectedPropertyData.propertyName || "",
        propertyAddress: selectedPropertyData.propertyAddress || "",
        tenureStartDate: selectedPropertyData.tenureStartDate || "",
        tenureEndDate: selectedPropertyData.tenureEndDate || "",
        occupied: selectedPropertyData.occupied || false,
        rooms: selectedPropertyData.rooms || [],
      }
      setFormData(propertyData)
      setOriginalData(propertyData)
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

  const handleRoomInputChange = (roomIdentifier, e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newRooms = prev.rooms.map((room) => {
        const currentRoomIdentifier = room._isNew ? room._tempId : room.roomId
        if (currentRoomIdentifier === roomIdentifier) {
          return { ...room, [name]: value }
        }
        return room
      })
      return { ...prev, rooms: newRooms }
    })

    // Clear errors when user starts typing
    const errorKey = `room-${roomIdentifier}-${name}`
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

  const handleAddRoom = () => {
    setFormData((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          _tempId: `new_room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Unique ID for key/id
          roomId: "", // Initialize as empty for user input
          roomName: "",
          capacity: "",
          occupied: false, // New rooms are not occupied by default
          _isNew: true, // Mark as new for potential backend handling
        },
      ],
    }))
  }

  const handleRemoveRoom = async (roomIdentifier) => {
    const roomToRemove = formData.rooms.find((room) => (room._isNew ? room._tempId : room.roomId) === roomIdentifier)

    if (!roomToRemove) {
      setApiError("Room not found.")
      return
    }

    if (roomToRemove.occupied) {
      setApiError("Cannot delete an occupied room. Please ensure it is vacant first.")
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete room "${roomToRemove.roomName || roomToRemove.roomId}"?`,
    )
    if (!confirmDelete) {
      return
    }

    setApiError("")
    setSuccessMessage("")

    try {
      if (!roomToRemove._isNew) {
        // If it's an existing room, call the API to delete it
        // await propertyAPI.deleteRoom(formData.propertyId, roomToRemove.roomId)
        await fetcher("http://localhost:8081/property/deleteRoom", {
              body: JSON.stringify({
                roomId: roomToRemove.roomId
              }),
            })

        setSuccessMessage(`Room "${roomToRemove.roomName}" deleted successfully!`)
      } else {
        setSuccessMessage(`New room "${roomToRemove.roomName}" removed from list.`)
      }

      const newRooms = formData.rooms.filter((room) => (room._isNew ? room._tempId : room.roomId) !== roomIdentifier)
      setFormData((prev) => ({ ...prev, rooms: newRooms }))

      // Clear any errors related to the removed room
      const newErrors = { ...errors }
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`room-${roomIdentifier}-`)) {
          delete newErrors[key]
        }
      })
      setErrors(newErrors)
    } catch (error) {
      console.error("Error deleting room:", error)
      setApiError(error.message || "Failed to delete room. Please try again.")
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Property Details validation
    if (!formData.propertyName.trim()) {
      newErrors.propertyName = "Property name is required"
    }
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = "Property address is required"
    }
    if (!formData.tenureStartDate) {
      newErrors.tenureStartDate = "Tenure start date is required"
    }
    if (!formData.tenureEndDate) {
      newErrors.tenureEndDate = "Tenure end date is required"
    }
    if (formData.tenureStartDate && formData.tenureEndDate) {
      const startDate = new Date(formData.tenureStartDate)
      const endDate = new Date(formData.tenureEndDate)
      if (startDate > endDate) {
        newErrors.tenureEndDate = "End date cannot be before start date"
      }
    }

    // Room Details validation
    formData.rooms.forEach((room) => {
      const roomKey = room._isNew ? room._tempId : room.roomId // Use _tempId for new rooms, roomId for existing
      if (room._isNew && !room.roomId.trim()) {
        // Validate the actual roomId field for new rooms
        newErrors[`room-${roomKey}-roomId`] = "Room ID is required for new rooms"
      }
      if (!room.roomName.trim()) {
        newErrors[`room-${roomKey}-roomName`] = "Room name is required"
      }
      if (!room.capacity || isNaN(Number(room.capacity)) || Number(room.capacity) <= 0) {
        newErrors[`room-${roomKey}-capacity`] = "Capacity must be a positive number"
      }
    })

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
      // Prepare data for backend: remove temporary client-side IDs if not needed by backend
      const roomsToSend = formData.rooms.map((room) => {
        const { _isNew, _tempId, ...rest } = room // Destructure _tempId as well
        // For new rooms, send the user-defined roomId, otherwise send the existing one
        return _isNew ? { roomId: rest.roomId, roomName: rest.roomName, capacity: rest.capacity } : rest
      })

      await fetcher("http://localhost:8081/property/editProperty", {
              body: JSON.stringify({
                propertyId: formData.propertyId,
                propertyName: formData.propertyName.trim(),
                propertyAddress: formData.propertyAddress.trim(),
                tenureStartDate: formData.tenureStartDate,
                tenureEndDate: formData.tenureEndDate,
                rooms: roomsToSend,
              }),
            })

      setSuccessMessage("Property details updated successfully!")
      setOriginalData({ ...formData })
    } catch (error) {
      console.error("Update property error:", error)
      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Failed to update property details. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProperty = async () => {
    if (!formData.propertyId) {
      setApiError("No property selected to delete.")
      return
    }

    if (formData.occupied) {
      setApiError("Cannot delete this property as it is currently occupied. Please ensure all rooms are vacant first.")
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete property "${formData.propertyName}" (${formData.propertyId})? This action cannot be undone.`,
    )
    if (!confirmDelete) {
      return
    }

    setIsDeletingProperty(true)
    setApiError("")
    setSuccessMessage("")

    try {
      await fetcher("http://localhost:8081/property/deleteProperty", {
              body: JSON.stringify({
                propertyId: formData.propertyId
              }),
            })

      setSuccessMessage(`Property "${formData.propertyName}" deleted successfully!`)
      // Clear form after successful deletion
      setFormData({
        propertyId: "",
        propertyName: "",
        propertyAddress: "",
        tenureStartDate: "",
        tenureEndDate: "",
        occupied: false,
        rooms: [],
      })
      setSelectedPropertyId("")
      setOriginalData({})
    } catch (error) {
      console.error("Error deleting property:", error)
      setApiError(error.message || "Failed to delete property. Please try again.")
    } finally {
      setIsDeletingProperty(false)
    }
  }

  // Get selected property details for display in the combobox trigger
  const selectedProperty = useMemo(() => {
    return propertySearchResults.find((property) => property.propertyId === selectedPropertyId)
  }, [propertySearchResults, selectedPropertyId])

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Show loading state during auth check
  if (isLoading && !formData.propertyId) {
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

  const existingRooms = formData.rooms.filter((room) => !room._isNew)
  const newRooms = formData.rooms.filter((room) => room._isNew)

  return (
    <AdminDashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Property Details</h1>
        <p className="text-slate-600">Search and edit property information and room details</p>
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

      {/* Property Search Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Property</span>
          </CardTitle>
          <CardDescription>Search for a property by name, address, or ID to edit its details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Property Search Combobox */}
            <div className="space-y-2">
              <Label>Select Property to Edit</Label>
              <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={propertySearchOpen}
                    className="w-full justify-between bg-transparent"
                  >
                    {selectedProperty ? (
                      <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4 text-slate-400" />
                        <span>
                          {selectedProperty.propertyName} ({selectedProperty.propertyId})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Search className="w-4 h-4" />
                        <span>Search properties by name, address, or ID...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search properties..."
                      value={propertySearchQuery}
                      onValueChange={setPropertySearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className="h-[300px]">
                        {isPropertySearchLoading && propertySearchResults.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-slate-500">Searching properties...</span>
                          </div>
                        ) : propertySearchResults.length === 0 ? (
                          <CommandEmpty>No properties found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {propertySearchResults.map((property) => (
                              <CommandItem
                                key={property.propertyId}
                                value={property.propertyId}
                                onSelect={() => handlePropertySelect(property.propertyId)}
                              >
                                <div className="flex items-center space-x-3 w-full">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedPropertyId === property.propertyId ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{property.propertyName || "N/A"}</div>
                                    <div className="text-sm text-slate-500">
                                      {property.propertyAddress || "No address"}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                            {propertyHasMore && (
                              <div className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadMoreProperties}
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
                                      Load more properties
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

      {/* Property Details Form */}
      {formData.propertyId && (
        <form onSubmit={handleUpdate}>
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Property Details</span>
              </CardTitle>
              <CardDescription>Basic information about the property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Property ID (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property ID</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="propertyId"
                      name="propertyId"
                      type="text"
                      value={formData.propertyId}
                      readOnly
                      className="pl-10 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500">This field cannot be edited</p>
                </div>

                {/* Property Name */}
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="propertyName"
                      name="propertyName"
                      type="text"
                      placeholder="Enter property name"
                      value={formData.propertyName}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.propertyName ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.propertyName && <p className="text-sm text-red-500">{errors.propertyName}</p>}
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
                    placeholder="Enter complete property address"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.propertyAddress ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.propertyAddress && <p className="text-sm text-red-500">{errors.propertyAddress}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tenure Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="tenureStartDate">Tenure Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="tenureStartDate"
                      name="tenureStartDate"
                      type="date"
                      value={formData.tenureStartDate}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.tenureStartDate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.tenureStartDate && <p className="text-sm text-red-500">{errors.tenureStartDate}</p>}
                </div>

                {/* Tenure End Date */}
                <div className="space-y-2">
                  <Label htmlFor="tenureEndDate">Tenure End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="tenureEndDate"
                      name="tenureEndDate"
                      type="date"
                      value={formData.tenureEndDate}
                      onChange={handleInputChange}
                      className={`pl-10 ${errors.tenureEndDate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.tenureEndDate && <p className="text-sm text-red-500">{errors.tenureEndDate}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Room Details Section */}
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DoorOpen className="w-5 h-5" />
                <span>Existing Room Details</span>
              </CardTitle>
              <CardDescription>Edit details of existing rooms or delete them if vacant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {existingRooms.length === 0 && (
                <p className="text-center text-slate-500">No existing rooms for this property.</p>
              )}
              {existingRooms.map((room) => (
                <div key={room.roomId} className="border rounded-md p-4 space-y-4 relative">
                  <h4 className="font-semibold text-slate-800">Room {room.roomName || room.roomId}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleRemoveRoom(room.roomId)}
                    disabled={room.occupied} // Disable if room is occupied
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Remove Room</span>
                  </Button>
                  {room.occupied && (
                    <p className="absolute top-2 right-12 text-sm text-red-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Occupied
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Room ID (Read-only for existing rooms) */}
                    <div className="space-y-2">
                      <Label htmlFor={`room-${room.roomId}-id`}>Room ID</Label>
                      <div className="relative">
                        <DoorOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`room-${room.roomId}-id`}
                          name="roomId"
                          type="text"
                          value={room.roomId}
                          readOnly
                          className="pl-10 bg-slate-100 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-slate-500">This field cannot be edited</p>
                    </div>

                    {/* Room Name */}
                    <div className="space-y-2">
                      <Label htmlFor={`room-${room.roomId}-name`}>Room Name</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`room-${room.roomId}-name`}
                          name="roomName"
                          type="text"
                          placeholder="e.g., Master Bedroom, Single Room"
                          value={room.roomName}
                          onChange={(e) => handleRoomInputChange(room.roomId, e)}
                          className={`pl-10 ${errors[`room-${room.roomId}-roomName`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`room-${room.roomId}-roomName`] && (
                        <p className="text-sm text-red-500">{errors[`room-${room.roomId}-roomName`]}</p>
                      )}
                    </div>

                    {/* Capacity */}
                    <div className="space-y-2">
                      <Label htmlFor={`room-${room.roomId}-capacity`}>Capacity</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`room-${room.roomId}-capacity`}
                          name="capacity"
                          type="number"
                          placeholder="e.g., 1, 2, 4"
                          value={room.capacity}
                          onChange={(e) => handleRoomInputChange(room.roomId, e)}
                          className={`pl-10 ${errors[`room-${room.roomId}-capacity`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`room-${room.roomId}-capacity`] && (
                        <p className="text-sm text-red-500">{errors[`room-${room.roomId}-capacity`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Add New Room Section */}
          <Card className="shadow-lg mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add New Room</span>
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRoom}>
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </CardHeader>
            <CardDescription className="px-6">Add new rooms to this property before saving.</CardDescription>
            <CardContent className="space-y-4 pt-4">
              {newRooms.length === 0 && (
                <p className="text-center text-slate-500">Click "Add Room" to add a new room.</p>
              )}
              {newRooms.map((room) => (
                <div key={room._tempId} className="border rounded-md p-4 space-y-4 relative">
                  <h4 className="font-semibold text-slate-800">New Room</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleRemoveRoom(room._tempId)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Remove New Room</span>
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Room ID (Editable for new rooms) */}
                    <div className="space-y-2">
                      <Label htmlFor={`new-room-${room._tempId}-id`}>Room ID</Label>
                      <div className="relative">
                        <DoorOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`new-room-${room._tempId}-id`}
                          name="roomId"
                          type="text"
                          placeholder="Enter new room ID"
                          value={room.roomId} // This will be empty initially
                          onChange={(e) => handleRoomInputChange(room._tempId, e)}
                          className={`pl-10 ${errors[`room-${room._tempId}-roomId`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`room-${room._tempId}-roomId`] && (
                        <p className="text-sm text-red-500">{errors[`room-${room._tempId}-roomId`]}</p>
                      )}
                    </div>

                    {/* Room Name */}
                    <div className="space-y-2">
                      <Label htmlFor={`new-room-${room._tempId}-name`}>Room Name</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`new-room-${room._tempId}-name`}
                          name="roomName"
                          type="text"
                          placeholder="e.g., Master Bedroom, Single Room"
                          value={room.roomName}
                          onChange={(e) => handleRoomInputChange(room._tempId, e)}
                          className={`pl-10 ${errors[`room-${room._tempId}-roomName`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`room-${room._tempId}-roomName`] && (
                        <p className="text-sm text-red-500">{errors[`room-${room._tempId}-roomName`]}</p>
                      )}
                    </div>

                    {/* Capacity */}
                    <div className="space-y-2">
                      <Label htmlFor={`new-room-${room._tempId}-capacity`}>Capacity</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id={`new-room-${room._tempId}-capacity`}
                          name="capacity"
                          type="number"
                          placeholder="e.g., 1, 2, 4"
                          value={room.capacity}
                          onChange={(e) => handleRoomInputChange(room._tempId, e)}
                          className={`pl-10 ${errors[`room-${room._tempId}-capacity`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors[`room-${room._tempId}-capacity`] && (
                        <p className="text-sm text-red-500">{errors[`room-${room._tempId}-capacity`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-lg font-semibold bg-transparent"
              onClick={handleDeleteProperty}
              disabled={isDeletingProperty || formData.occupied || !formData.propertyId}
            >
              {isDeletingProperty ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete This Property
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
                  Update Property
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* No Property Selected State */}
      {!formData.propertyId && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Home className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Property Selected</h3>
            <p className="text-slate-600 text-center">
              Please search and select a property from the dropdown above to view and edit its details.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminDashboardLayout>
  )
}
