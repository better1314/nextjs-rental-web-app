"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mountain, Mail, Lock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { fetcher } from "@/common/webclient"
import { sessionUtils } from "@/common/session"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")
   const router = useRouter()

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  }

  const validateForm = () => {
    const newErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
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

    try {
      const response = await fetcher("http://localhost:8081/login", {
        body : JSON.stringify({
          emailAddress: formData.email,
          password: formData.password
        })
      })

      // Handle successful login
      console.log("Login successful:", response)
      // Save user session
      const sessionSaved = sessionUtils.saveSession(response.userDetail)

      if (!sessionSaved) {
        throw new Error("Failed to save session")
      }

      // Check user role and redirect accordingly
      const userRole = response.userDetail.roleCode
      if (userRole === "A") {
        router.push("/admin/dashboard/")
      } else if (userRole === "N") {
        router.push("/dashboard/")
      } else {
        router.push("/")
      }
    } catch (error) {
      console.error("Login error:", error)

      if (error.message) {
        setApiError(error.message)
      } else {
        setApiError("Login failed. Please try again.")
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

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {/* API Error Alert */}
          {apiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {"Don't have an account? "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Register here
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