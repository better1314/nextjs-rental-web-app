import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Receipt,
  Calendar,
  DollarSign,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Filter,
  X,
} from "lucide-react"
import { billAPI } from "@/common/api"

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount)
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Helper function to format month from YYYY-MM format
function formatMonth(monthString) {
  if (!monthString) return ""
  const [year, month] = monthString.split("-")
  const date = new Date(year, month - 1)
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

// Helper function to get status badge
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

// Helper function to get available years from bills
function getAvailableYears(bills) {
  const years = new Set()
  bills.forEach((bill) => {
    if (bill.billMonth) {
      const year = bill.billMonth.split("-")[0]
      years.add(year)
    }
  })
  return Array.from(years).sort((a, b) => b - a) // Sort descending (newest first)
}

export function TenantBillSection({ selectedRental }) {
  const [bills, setBills] = useState([])
  const [filteredBills, setFilteredBills] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [uploadingBills, setUploadingBills] = useState(new Set())

  // Load bills when selectedRental changes
  useEffect(() => {
    console.log("selectedRental changed:", selectedRental) // Debug log
    if (selectedRental?.id) {
      console.log("Loading bills for rental ID:", selectedRental.id) // Debug log
      loadBills()
    } else {
      console.log("No selectedRental or ID, clearing bills") // Debug log
      setBills([])
      setFilteredBills([])
    }
  }, [selectedRental?.id])

  // Filter bills by year when selectedYear or bills change
  useEffect(() => {
    if (selectedYear === "all") {
      setFilteredBills(bills)
    } else {
      const filtered = bills.filter((bill) => {
        if (!bill.billMonth) return false
        const billYear = bill.billMonth.split("-")[0]
        return billYear === selectedYear
      })
      setFilteredBills(filtered)
    }
  }, [bills, selectedYear])

  const loadBills = async () => {
    if (!selectedRental?.id) return

    console.log("loadBills called for rental ID:", selectedRental.id) // Debug log
    setIsLoading(true)
    setError("")

    try {
      const result = await billAPI.getTenantBills(selectedRental.id)
      console.log("Bills API result:", result) // Debug log
      if (result.success) {
        setBills(result.bills)
        // Reset year filter when loading new bills
        setSelectedYear("all")
      } else {
        setError(result.error || "Failed to load bills")
        setBills([])
      }
    } catch (err) {
      console.error("Error loading bills:", err)
      setError("Failed to load bills. Please try again.")
      setBills([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (billId, file) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/bmp",
      "image/webp",
      "image/tiff",
    ]

    if (file.size > maxSize) {
      setError("File size must be less than 10MB")
      return
    }

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload image file (JPG, PNG, etc.)")
      return
    }

    setUploadingBills((prev) => new Set(prev).add(billId))
    setError("")
    setSuccessMessage("")

    try {
      const result = await billAPI.uploadReceipt(billId, file)
      if (result.success) {
        setSuccessMessage(result.message)
        // Reload bills to get updated status
        await loadBills()
      } else {
        setError(result.error || "Failed to upload receipt")
      }
    } catch (err) {
      console.error("Error uploading receipt:", err)
      setError("Failed to upload receipt. Please try again.")
    } finally {
      setUploadingBills((prev) => {
        const newSet = new Set(prev)
        newSet.delete(billId)
        return newSet
      })
    }
  }

  const handleFileInputChange = (billId, event) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(billId, file)
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = ""
  }

  const availableYears = useMemo(() => getAvailableYears(bills), [bills])

  if (!selectedRental) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Receipt className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Tenancy Selected</h3>
          <p className="text-slate-600 text-center">
            Please select a tenancy agreement to view your bills and payment information.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Bills & Payment</span>
            </CardTitle>
            <CardDescription>View your bills and upload payment receipts</CardDescription>
          </div>

          {/* Year Filter */}
          {availableYears.length > 0 && (
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
            <span className="text-slate-600">Loading bills...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          /* No Bills State */
          <div className="text-center py-8">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {selectedYear === "all" ? "No Bills Found" : `No Bills for ${selectedYear}`}
            </h3>
            <p className="text-slate-600">
              {selectedYear === "all"
                ? "You don't have any bills for this tenancy agreement."
                : `No bills found for the year ${selectedYear}. Try selecting a different year.`}
            </p>
            {selectedYear !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear("all")}
                className="mt-4 bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filter
              </Button>
            )}
          </div>
        ) : (
          /* Bills List */
          <div className="space-y-4">
            {filteredBills.map((bill) => (
              <div key={bill.billId} className="border rounded-lg p-4 space-y-4">
                {/* Bill Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold text-slate-800">Bill {bill.billId}</h4>
                    <Badge {...getBillStatusBadge(bill.status)} size="sm">
                      {bill.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500">
                    Created: {formatDate(bill.createdOn)}
                  </div>
                </div>

                {/* Bill Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Bill Type */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 uppercase tracking-wide">Bill Type</Label>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{bill.billTypeName || bill.billType}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 uppercase tracking-wide">Amount</Label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-lg">{formatCurrency(bill.amount)}</span>
                    </div>
                  </div>

                  {/* Bill Month */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 uppercase tracking-wide">Bill Month</Label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{formatMonth(bill.billMonth)}</span>
                    </div>
                  </div>

                  {/* Remarks */}
                  {bill.remark && (
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <Label className="text-xs text-slate-500 uppercase tracking-wide">Remarks</Label>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{bill.remark}</p>
                    </div>
                  )}
                </div>

                {/* Upload Receipt Section */}
                {bill.status?.toUpperCase() === "CREATED" && (
                  <div className="border-t pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <Label className="text-sm font-medium">Upload Payment Receipt</Label>
                        <p className="text-xs text-slate-500 mt-1">
                          Upload PDF or image files (max 10MB)
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.svg"
                          onChange={(e) => handleFileInputChange(bill.billId, e)}
                          disabled={uploadingBills.has(bill.billId)}
                          className="hidden"
                          id={`file-upload-${bill.billId}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`file-upload-${bill.billId}`).click()}
                          disabled={uploadingBills.has(bill.billId)}
                          className="bg-transparent"
                        >
                          {uploadingBills.has(bill.billId) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Receipt
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
