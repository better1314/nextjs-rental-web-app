"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Home,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Hash,
} from "lucide-react"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { fetcher } from "@/common/webclient"

export default function AddPropertyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errors, setErrors] = useState({})

  // Form data state
  const [formData, setFormData] = useState({
    // Property Owner
    ownerFullName: "",
    ownerContactNumber: "",
    ownerEmail: "",

    // Property Details
    propertyName: "",
    propertyAddress: "",
    tenureStartDate: "",
    tenureEndDate: "",

    // Room Details (dynamic array)
    rooms: [{ id: 1, roomId: "", roomName: "", capacity: "" }],
  })

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  // Phone number regex (basic format)
  const phoneRegex = /^[+]?[\d\s\-()]{8,15}$/

  // Check authorization on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)

        // Check if user is logged in and is admin
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

  const handleRoomChange = (roomId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, [field]: value } : room)),
    }))

    // Clear room-specific errors
    if (errors[`room_${field}_${roomId}`]) {
      setErrors((prev) => ({
        ...prev,
        [`room_${field}_${roomId}`]: "",
      }))
    }
  }

  const addRoom = () => {
    const newRoomId = Math.max(...formData.rooms.map((r) => r.id)) + 1
    setFormData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { id: newRoomId, roomId: "", roomName: "", capacity: "" }],
    }))
  }

  const removeRoom = (roomId) => {
    if (formData.rooms.length > 1) {
      setFormData((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((room) => room.id !== roomId),
      }))

      // Clear errors for removed room
      const errorKeysToRemove = Object.keys(errors).filter((key) => key.includes(`_${roomId}`))
      if (errorKeysToRemove.length > 0) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          errorKeysToRemove.forEach((key) => delete newErrors[key])
          return newErrors
        })
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Property Owner validation
    if (!formData.ownerFullName.trim()) {
      newErrors.ownerFullName = "Owner full name is required"
    } else if (formData.ownerFullName.trim().length < 2) {
      newErrors.ownerFullName = "Owner full name must be at least 2 characters"
    }

    if (!formData.ownerContactNumber) {
      newErrors.ownerContactNumber = "Owner contact number is required"
    } else if (!phoneRegex.test(formData.ownerContactNumber)) {
      newErrors.ownerContactNumber = "Please enter a valid contact number"
    }

    if (!formData.ownerEmail) {
      newErrors.ownerEmail = "Owner email is required"
    } else if (!emailRegex.test(formData.ownerEmail)) {
      newErrors.ownerEmail = "Please enter a valid email address"
    }

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
    } else if (formData.tenureStartDate && formData.tenureEndDate <= formData.tenureStartDate) {
      newErrors.tenureEndDate = "Tenure end date must be after start date"
    }

    // Room Details validation
    formData.rooms.forEach((room) => {
      if (!room.roomId.trim()) {
        newErrors[`room_roomId_${room.id}`] = "Room ID is required"
      }
      if (!room.roomName.trim()) {
        newErrors[`room_roomName_${room.id}`] = "Room name is required"
      }
      if (!room.capacity.trim()) {
        newErrors[`room_capacity_${room.id}`] = "Room capacity is required"
      } else if (isNaN(room.capacity) || Number.parseInt(room.capacity) <= 0) {
        newErrors[`room_capacity_${room.id}`] = "Please enter a valid capacity (number greater than 0)"
      }
    })

    // Check for duplicate room IDs
    const roomIds = formData.rooms.map((room) => room.roomId.trim().toLowerCase()).filter((id) => id)
    const duplicateRoomIds = roomIds.filter((id, index) => roomIds.indexOf(id) !== index)
    if (duplicateRoomIds.length > 0) {
      formData.rooms.forEach((room) => {
        if (duplicateRoomIds.includes(room.roomId.trim().toLowerCase())) {
          newErrors[`room_roomId_${room.id}`] = "Room ID must be unique"
        }
      })
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
      const response = await fetcher("/property/addProperty", {
                    body : JSON.stringify({
                            propertyOwnerDetails: {
                            fullName: formData.ownerFullName.trim(),
                            contactNo: formData.ownerContactNumber,
                            email: formData.ownerEmail.toLowerCase(),
                            },
                            propertyDetails: {
                            propertyName: formData.propertyName.trim(),
                            propertyAddress: formData.propertyAddress.trim(),
                            tenureStartDate: formData.tenureStartDate,
                            tenureEndDate: formData.tenureEndDate,
                            },
                            roomList: formData.rooms.map((room) => ({
                            roomId: room.roomId.trim(),
                            roomNumber: room.roomName.trim(),
                            capacity: Number.parseInt(room.capacity),
                            })),
                        })
                  })

      // Handle successful property creation
      console.log("Property created successfully:", response)
      setSuccessMessage("Property added successfully!")

      // Reset form
      setFormData({
        ownerFullName: "",
        ownerContactNumber: "",
        ownerEmail: "",
        propertyName: "",
        propertyAddress: "",
        tenureStartDate: "",
        tenureEndDate: "",
        rooms: [{ id: 1, roomId: "", roomName: "", capacity: "" }],
      })
    } catch (error) {
      console.error("Add property error:", error)

      if (error.response?.data?.message) {
        setApiError(error.response.data.message)
      } else if (error.response?.status >= 500) {
        setApiError("Server error. Please try again later.")
      } else {
        setApiError("Failed to add property. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearForm = () => {
    setFormData({
      ownerFullName: "",
      ownerContactNumber: "",
      ownerEmail: "",
      propertyName: "",
      propertyAddress: "",
      tenureStartDate: "",
      tenureEndDate: "",
      rooms: [{ id: 1, roomId: "", roomName: "", capacity: "" }],
    })
    setErrors({})
    setApiError("")
    setSuccessMessage("")
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Add New Property</h1>
        <p className="text-slate-600">Add a new property with owner details and room information</p>
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
        {/* Property Owner Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Property Owner</span>
            </CardTitle>
            <CardDescription>Information about the property owner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Full Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ownerFullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="ownerFullName"
                    name="ownerFullName"
                    type="text"
                    placeholder="Enter owner's full name"
                    value={formData.ownerFullName}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.ownerFullName ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.ownerFullName && <p className="text-sm text-red-500">{errors.ownerFullName}</p>}
              </div>

              {/* Owner Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="ownerContactNumber">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="ownerContactNumber"
                    name="ownerContactNumber"
                    type="tel"
                    placeholder="e.g. +60123456789"
                    value={formData.ownerContactNumber}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.ownerContactNumber ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.ownerContactNumber && <p className="text-sm text-red-500">{errors.ownerContactNumber}</p>}
              </div>

              {/* Owner Email */}
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    placeholder="Enter owner's email"
                    value={formData.ownerEmail}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.ownerEmail ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.ownerEmail && <p className="text-sm text-red-500">{errors.ownerEmail}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Property Details</span>
            </CardTitle>
            <CardDescription>Basic information about the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="propertyName">Property Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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

              {/* Property Address */}
              <div className="space-y-2 md:col-span-2">
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

        {/* Room Details Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Room Details</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRoom} className="bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </CardTitle>
            <CardDescription>Add rooms available in this property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.rooms.map((room, index) => (
              <div key={room.id} className="p-4 border rounded-lg bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">Room {index + 1}</h4>
                  {formData.rooms.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRoom(room.id)}
                      className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Room ID */}
                  <div className="space-y-2">
                    <Label htmlFor={`roomId_${room.id}`}>Room ID</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id={`roomId_${room.id}`}
                        type="text"
                        placeholder="e.g., A-01, R001, 101"
                        value={room.roomId}
                        onChange={(e) => handleRoomChange(room.id, "roomId", e.target.value)}
                        className={`pl-10 ${errors[`room_roomId_${room.id}`] ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors[`room_roomId_${room.id}`] && (
                      <p className="text-sm text-red-500">{errors[`room_roomId_${room.id}`]}</p>
                    )}
                  </div>

                  {/* Room Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`roomName_${room.id}`}>Room Name</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id={`roomName_${room.id}`}
                        type="text"
                        placeholder="e.g., Master Bedroom, Single Room"
                        value={room.roomName}
                        onChange={(e) => handleRoomChange(room.id, "roomName", e.target.value)}
                        className={`pl-10 ${errors[`room_roomName_${room.id}`] ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors[`room_roomName_${room.id}`] && (
                      <p className="text-sm text-red-500">{errors[`room_roomName_${room.id}`]}</p>
                    )}
                  </div>

                  {/* Room Capacity */}
                  <div className="space-y-2">
                    <Label htmlFor={`roomCapacity_${room.id}`}>Capacity</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id={`roomCapacity_${room.id}`}
                        type="number"
                        min="1"
                        placeholder="e.g., 1, 2, 4"
                        value={room.capacity}
                        onChange={(e) => handleRoomChange(room.id, "capacity", e.target.value)}
                        className={`pl-10 ${errors[`room_capacity_${room.id}`] ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors[`room_capacity_${room.id}`] && (
                      <p className="text-sm text-red-500">{errors[`room_capacity_${room.id}`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {formData.rooms.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Home className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No rooms added yet. Click "Add Room" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Property...
              </>
            ) : (
              "Add Property"
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
