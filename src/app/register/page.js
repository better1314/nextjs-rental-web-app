"use client"

import { useState } from "react"
import Link from "next/link"
import { fetcher } from "@/common/webclient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mountain, User, CreditCard, Calendar, Phone, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    nric: "",
    dateOfBirth: "",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  // NRIC validation regex (Singapore format)
  const nricRegex = /^\d{6}-\d{2}-\d{4}$/
  // Phone number regex (basic format)
  const phoneRegex = /^[+]?[\d\s\-()]{8,15}$/

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

    // NRIC validation
    if (!formData.nric) {
      newErrors.nric = "NRIC is required"
    } else if (!nricRegex.test(formData.nric.toUpperCase())) {
      newErrors.nric = "Please enter a valid NRIC (e.g., S1234567A)"
    }

    // Date of Birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required"
    } else {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old"
      }
    }

    // Contact Number validation
    if (!formData.contactNumber) {
      newErrors.contactNumber = "Contact number is required"
    } else if (!phoneRegex.test(formData.contactNumber)) {
      newErrors.contactNumber = "Please enter a valid contact number"
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setApiError("")
    setSuccessMessage("")

    try {
      const response = await fetcher("http://localhost:8081/user/register", {
              body : JSON.stringify({
                user : {
                    fullName: formData.fullName.trim(),
                    nric: formData.nric.toUpperCase(),
                    dateOfBirth: formData.dateOfBirth,
                    contactNo: formData.contactNumber,
                    email: formData.email.toLowerCase(),
                },
                plainPassword: formData.password,
              })
            })

      // Handle successful registration
      console.log("Registration successful:", response)
      setSuccessMessage("Registration successful! You can now login with your credentials.")

      // Reset form
      setFormData({
        fullName: "",
        nric: "",
        dateOfBirth: "",
        contactNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Registration error:", error)

      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Logo */}
      <div className="flex items-center space-x-2 mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Mountain className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-slate-800">RentEase</span>
      </div>

      {/* Register Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Register as a tenant to easy manage</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success Message */}
          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* API Error Alert */}
          {apiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.fullName ? "border-red-500" : ""}`}
                />
              </div>
              {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
            </div>

            {/* NRIC Field */}
            <div className="space-y-2">
              <Label htmlFor="nric">NRIC</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="nric"
                  name="nric"
                  type="text"
                  placeholder="e.g. 123456-01-1234"
                  value={formData.nric}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.nric ? "border-red-500" : ""}`}
                  maxLength={14}
                />
              </div>
              {errors.nric && <p className="text-sm text-red-500">{errors.nric}</p>}
            </div>

            {/* Date of Birth Field */}
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

            {/* Contact Number Field */}
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  placeholder="e.g. +60121234567"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.contactNumber ? "border-red-500" : ""}`}
                />
              </div>
              {errors.contactNumber && <p className="text-sm text-red-500">{errors.contactNumber}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home */}
      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
