"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  Receipt,
  Eye,
  Check,
  X,
  User,
  CreditCard,
  DoorOpen,
  Calendar,
} from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { approveBillAPI } from "@/common/api"

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

// Helper function to get status badge
function getStatusBadge(status) {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return { variant: "secondary", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" }
    case "APPROVED":
      return { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" }
    case "REJECTED":
      return { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-100" }
    case "CREATED":
      return { variant: "outline", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" }
    default:
      return { variant: "outline", className: "" }
  }
}

export default function ApproveBillPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Search states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  // Modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [receiptImageUrl, setReceiptImageUrl] = useState("")
  const [isImageLoading, setIsImageLoading] = useState(false)

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

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

  // Search bills function
  const searchBills = useCallback(async (query = "", page = 1, reset = false) => {
    try {
      setIsSearching(true)
      const result = await approveBillAPI.searchBillsForApproval(query, page, 20)
      if (result.success) {
        if (reset || page === 1) {
          setSearchResults(result.bills)
        } else {
          setSearchResults((prev) => [...prev, ...result.bills])
        }
        setSearchHasMore(result.hasMore)
        setSearchPage(result.page)
        setTotalCount(result.totalCount)
        setHasSearched(true)
        console.log(`Loaded ${result.bills.length} bills, Total: ${result.totalCount}, Has More: ${result.hasMore}`)
      } else {
        console.error("Bill search failed:", result.error)
        if (reset || page === 1) {
          setSearchResults([])
          setSearchHasMore(false)
          setTotalCount(0)
        }
        setApiError(result.error || "Failed to search bills")
      }
    } catch (error) {
      console.error("Unexpected error in searchBills:", error)
      if (reset || page === 1) {
        setSearchResults([])
        setSearchHasMore(false)
        setTotalCount(0)
      }
      setApiError("An unexpected error occurred while searching bills")
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Effect for debounced search - only search if there's a query
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      setApiError("")
      setSuccessMessage("")
      searchBills(debouncedSearchQuery, 1, true)
    } else {
      // Clear results when search query is empty
      setSearchResults([])
      setTotalCount(0)
      setHasSearched(false)
      setSearchHasMore(false)
    }
  }, [debouncedSearchQuery, searchBills])

  // Load more bills (pagination)
  const loadMoreBills = useCallback(() => {
    if (searchHasMore && !isSearching) {
      searchBills(debouncedSearchQuery, searchPage + 1, false)
    }
  }, [searchHasMore, isSearching, debouncedSearchQuery, searchPage, searchBills])

  // Handle view receipt
  const handleViewReceipt = async (bill) => {
    setSelectedBill(bill)
    setShowReceiptModal(true)
    setIsImageLoading(true)
    setReceiptImageUrl("")

    try {
      const result = await approveBillAPI.getReceiptImage(bill.imgPath)
      if (result.success) {
        // Try to load the actual image first, fallback to error image if it fails
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          setReceiptImageUrl(result.imageUrl)
        }
        img.onerror = () => {
          // If the actual image fails to load, use the local error image
          setReceiptImageUrl("/image-error.png")
        }
        img.src = result.imageUrl
      } else {
        setApiError("Failed to load receipt image")
        setReceiptImageUrl("/image-error.png")
      }
    } catch (error) {
      console.error("Error loading receipt:", error)
      setApiError("An error occurred while loading receipt image")
      setReceiptImageUrl("/image-error.png")
    } finally {
      setIsImageLoading(false)
    }
  }

  // Handle approve bill
  const handleApproveBill = (bill) => {
    setSelectedBill(bill)
    setShowApproveModal(true)
  }

  // Handle reject bill
  const handleRejectBill = (bill) => {
    setSelectedBill(bill)
    setShowRejectModal(true)
  }

  // Confirm approve
  const confirmApprove = async () => {
    if (!selectedBill) return

    setIsActionLoading(true)
    setApiError("")
    setSuccessMessage("")

    const username = sessionUtils.getUser()?.fullName || "ADMIN"

    try {
      const result = await approveBillAPI.approveBill(selectedBill.receiptId, selectedBill.billId, username)

      if (result.success) {
        setSuccessMessage(result.message)
        // Update the bill status in the list instead of removing it
        setSearchResults((prev) =>
          prev.map((bill) => (bill.receiptId === selectedBill.receiptId ? { ...bill, status: "APPROVED" } : bill)),
        )
        setShowApproveModal(false)
        setSelectedBill(null)
      } else {
        setApiError(result.error || "Failed to approve bill. Please try again.")
      }
    } catch (error) {
      console.error("Approve bill error:", error)
      setApiError("Failed to approve bill. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // Confirm reject
  const confirmReject = async () => {
    if (!selectedBill) return

    setIsActionLoading(true)
    setApiError("")
    setSuccessMessage("")

    const username = sessionUtils.getUser()?.fullName || "ADMIN"

    try {
      const result = await approveBillAPI.rejectBill(selectedBill.receiptId, selectedBill.billId, username)

      if (result.success) {
        setSuccessMessage(result.message)
        // Update the bill status in the list instead of removing it
        setSearchResults((prev) =>
          prev.map((bill) => (bill.receiptId === selectedBill.receiptId ? { ...bill, status: "REJECTED" } : bill)),
        )
        setShowRejectModal(false)
        setSelectedBill(null)
      } else {
        setApiError(result.error || "Failed to reject bill. Please try again.")
      }
    } catch (error) {
      console.error("Reject bill error:", error)
      setApiError("Failed to reject bill. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Approve Bills</h1>
        <p className="text-slate-600">Review and approve tenant bill receipts</p>
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

      {/* Search Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Bills for Approval</span>
          </CardTitle>
          <CardDescription>
            Search for bills by tenancy agreement, tenant name, IC number, room name, or property name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="search">Search Bills</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search by tenancy agreement, tenant name, IC, room name, or property name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Section */}
      {hasSearched && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Bills for Approval ({totalCount})</span>
            </CardTitle>
            <CardDescription>Review and approve or reject tenant bill receipts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isSearching && searchResults.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
                <span className="text-slate-600">Searching bills...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No bills found.</p>
                <p className="text-slate-400 text-sm">Try adjusting your search criteria.</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt ID</TableHead>
                        <TableHead>Receipt Type</TableHead>
                        <TableHead>Bill Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tenant Info</TableHead>
                        <TableHead>Uploaded Date</TableHead>
                        <TableHead>View Receipt</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((bill) => (
                        <TableRow key={bill.receiptId}>
                          <TableCell className="font-medium">{bill.receiptId}</TableCell>
                          <TableCell>{bill.receiptType}</TableCell>
                          <TableCell>{bill.billMonth}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(bill.amount)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{bill.tenantName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{bill.tenantIC}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <DoorOpen className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{bill.roomName}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-sm">{formatDateTime(bill.uploadedDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReceipt(bill)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </Button>
                          </TableCell>
                          <TableCell>
                            {bill.status === "Pending" ? (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveBill(bill)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectBill(bill)}>
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge {...getStatusBadge(bill.status)} size="sm">
                                {bill.status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Load More Button */}
                {searchHasMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={loadMoreBills} disabled={isSearching}>
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        "Load More Bills"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Search Performed State */}
      {!hasSearched && !searchQuery.trim() && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Receipt className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Search Bills for Approval</h3>
            <p className="text-slate-600 text-center">
              Start typing in the search box above to find bills that need approval.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Receipt - {selectedBill?.receiptId}</span>
            </DialogTitle>
            <DialogDescription>
              Receipt for {selectedBill?.receiptType} - {selectedBill?.tenantName}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto">
            {isImageLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
                <span className="text-slate-600">Loading receipt...</span>
              </div>
            ) : receiptImageUrl ? (
              <div className="text-center">
                <img
                  src={receiptImageUrl || "/placeholder.svg"}
                  alt={`Receipt ${selectedBill?.receiptId}`}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                  onError={(e) => {
                    // Fallback to error image if image fails to load
                    e.target.src = "/image-error.png"
                  }}
                />
                {selectedBill?.imgPath && (
                  <p className="text-xs text-slate-500 mt-2">Image path: {selectedBill.imgPath}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-slate-500">Failed to load receipt image</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Approve Receipt</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this receipt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBill && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Receipt ID:</span>
                  <span className="text-sm">{selectedBill.receiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm">{selectedBill.receiptType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm">{formatCurrency(selectedBill.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tenant:</span>
                  <span className="text-sm">{selectedBill.tenantName}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={isActionLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmApprove}
              disabled={isActionLoading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Reject Receipt</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this receipt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBill && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Receipt ID:</span>
                  <span className="text-sm">{selectedBill.receiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm">{selectedBill.receiptType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm">{formatCurrency(selectedBill.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tenant:</span>
                  <span className="text-sm">{selectedBill.tenantName}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={isActionLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmReject}
              disabled={isActionLoading}
              className="w-full sm:w-auto"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Reject Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
