"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Eye, Play, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Settings, PlayCircle } from "lucide-react"

import { AdminDashboardLayout } from "@/components/admin-dashboard-layout/admin-dashboard-layout"
import { sessionUtils } from "@/common/session"
import { schedulerAPI } from "@/common/api"

export default function CheckSchedulerPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isSchedulersLoading, setIsSchedulersLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isTriggerLoading, setIsTriggerLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [historyError, setHistoryError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Data states
  const [schedulers, setSchedulers] = useState([])
  const [selectedScheduler, setSelectedScheduler] = useState(null)
  const [schedulerHistory, setSchedulerHistory] = useState([])

  // Modal states
  const [showTriggerModal, setShowTriggerModal] = useState(false)

  // Check authorization on component mount
  useEffect(() => {
    const doInit = async () => {
      try {
        setIsLoading(true)
        if (!sessionUtils.isLoggedIn()) {
          router.push("/login")
          return
        }
        if (!sessionUtils.isAdmin()) {
          router.push("/")
          return
        }
        setIsAuthorized(true)
        // Load schedulers after authorization check
        await loadSchedulers()
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    doInit()
  }, [router])

  // Load schedulers function
  const loadSchedulers = async () => {
    try {
      setIsSchedulersLoading(true)
      setApiError("")
      const result = await schedulerAPI.getSchedulers()
      if (result.success) {
        setSchedulers(result.data)
        console.log(`Loaded ${result.data.length} schedulers`)
      } else {
        console.error("Scheduler loading failed:", result.error)
        setApiError(result.error || "Failed to load schedulers")
      }
    } catch (error) {
      console.error("Unexpected error in loadSchedulers:", error)
      setApiError("An unexpected error occurred while loading schedulers")
    } finally {
      setIsSchedulersLoading(false)
    }
  }

  // Handle view scheduler - now uses schedulerId
  const handleViewScheduler = async (scheduler) => {
    try {
      setIsHistoryLoading(true)
      setHistoryError("")
      setSelectedScheduler(scheduler)

      const result = await schedulerAPI.getSchedulerHistory(scheduler.schedulerId)
      if (result.success) {
        setSchedulerHistory(result.data)
        console.log(`Loaded ${result.data.length} history records for ${scheduler.schedulerName}`)
      } else {
        console.error("Scheduler history loading failed:", result.error)
        setHistoryError(result.error || "Failed to load scheduler history")
      }
    } catch (error) {
      console.error("Unexpected error in handleViewScheduler:", error)
      setHistoryError("An unexpected error occurred while loading scheduler history")
    } finally {
      setIsHistoryLoading(false)
    }
  }

  // Handle manual trigger
  const handleManualTrigger = (scheduler) => {
    setSelectedScheduler(scheduler)
    setShowTriggerModal(true)
  }

  // Confirm manual trigger - now uses schedulerId
  const confirmManualTrigger = async () => {
    if (!selectedScheduler) return

    setIsTriggerLoading(true)
    setApiError("")
    setSuccessMessage("")
    setHistoryError("")

    try {
      const result = await schedulerAPI.triggerScheduler(selectedScheduler.schedulerId)

      if (result.success) {
        setSuccessMessage(result.message)
        setShowTriggerModal(false)
        // Refresh history after successful trigger
        await handleViewScheduler(selectedScheduler)
      } else {
        setHistoryError(result.error || "Failed to trigger scheduler. Please try again.")
        setShowTriggerModal(false)
      }
    } catch (error) {
      console.error("Manual trigger error:", error)
      setHistoryError("Failed to trigger scheduler. Please try again.")
      setShowTriggerModal(false)
    } finally {
      setIsTriggerLoading(false)
    }
  }

  // Helper function to get status badge - updated for new status values
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      case "running":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <PlayCircle className="w-3 h-3 mr-1" />
            Running
          </Badge>
        )
      case "created":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <Clock className="w-3 h-3 mr-1" />
            Created
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Helper function to format datetime
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return ""
    const date = new Date(dateTimeString)
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Check Scheduler</h1>
        <p className="text-slate-600">Monitor and manage system schedulers</p>
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

      {/* Schedulers List */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>System Schedulers</span>
          </CardTitle>
          <CardDescription>View and manage all system schedulers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {isSchedulersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
              <span className="text-slate-600">Loading schedulers...</span>
            </div>
          ) : schedulers.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No schedulers found.</p>
              <p className="text-slate-400 text-sm">Please check your system configuration.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduler Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulers.map((scheduler, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{scheduler.schedulerName}</TableCell>
                      <TableCell className="text-slate-600">{scheduler.description}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewScheduler(scheduler)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduler History */}
      {selectedScheduler && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{selectedScheduler.schedulerName} History</span>
                </CardTitle>
                <CardDescription className="mt-1">{selectedScheduler.description}</CardDescription>
              </div>
              <Button
                onClick={() => handleManualTrigger(selectedScheduler)}
                disabled={isTriggerLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Manual Trigger
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* History Error Alert */}
            {historyError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{historyError}</AlertDescription>
              </Alert>
            )}

            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
                <span className="text-slate-600">Loading scheduler history...</span>
              </div>
            ) : schedulerHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No history found for this scheduler.</p>
                <p className="text-slate-400 text-sm">History will appear here after the scheduler runs.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Execution Date Time</TableHead>
                      <TableHead>Task Status</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulerHistory.map((history, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{formatDateTime(history.executionDateTime)}</TableCell>
                        <TableCell>{getStatusBadge(history.taskStatus)}</TableCell>
                        <TableCell className="text-slate-600">{history.remark}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Trigger Confirmation Dialog */}
      <Dialog open={showTriggerModal} onOpenChange={setShowTriggerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-green-500" />
              <span>Manual Trigger Confirmation</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to manually trigger the scheduler "{selectedScheduler?.schedulerName}"? This action
              will execute the scheduler immediately.
            </DialogDescription>
          </DialogHeader>

          {selectedScheduler && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Scheduler:</span>
                  <span className="text-sm">{selectedScheduler.schedulerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Description:</span>
                  <span className="text-sm">{selectedScheduler.description}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTriggerModal(false)}
              disabled={isTriggerLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmManualTrigger}
              disabled={isTriggerLoading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isTriggerLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Confirm Trigger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  )
}
