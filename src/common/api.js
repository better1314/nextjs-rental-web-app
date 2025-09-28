import { fetcher, fetchImg, get } from "@/common/webclient"


export const dashboardAPI = {
  getDashboardStats: async () => {
    try{
    const response = await get("/system/getDashboardStastics")

    return response;
    }catch(error){
      throw new Error("Failed to fetch dashboard statistics. Please try again.")
    }
  }
}

export const userAPI = {
  // Search users with pagination
  searchUsers: async (query = "", page = 1, limit = 20, mode = "") => {
    try {
      const response = await fetcher("/user/searchUserList", {
        body: JSON.stringify({
          query: query.trim(),
          page: page,
          limit: limit,
          mode: mode
        })
      })

      const { userList, totalUser } = response

      // Validate response structure
      if (!Array.isArray(userList)) {
        throw new Error("Invalid response: userList is not an array")
      }

      const totalCount = Number.parseInt(totalUser, 10) || 0
      const hasMore = page * limit < totalCount

      // Transform UserVO to standardized format
      const transformedUsers = userList.map((user) => {
        // Validate required fields
        if (!user.userId) {
          console.warn("User missing userId:", user)
        }

        return {
          id: user.userId || `temp_${Date.now()}_${Math.random()}`,
          fullName: user.fullName || "",
          email: user.emailAddress || "",
          contactNumber: user.contactNo || "",
          nric: user.nric || "",
          dateOfBirth: user.dateOfBirth || "",
          statusCode: user.statusCode || "",
          roleCode: user.roleCode || "",
          // Keep original data for reference
          _original: user,
        }
      })

      return {
        users: transformedUsers,
        totalCount,
        hasMore,
        page,
        success: true,
      }
    } catch (error) {
      console.error("Error in userAPI.searchUsers:", error)

      // Return standardized error response
      return {
        users: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        success: false,
        error: {
          message: error.response?.data?.message || error.message || "Failed to search users",
          status: error.response?.status,
          code: error.code,
        },
      }
    }
  }
}

export const propertyAPI = {
  // Search available rooms with pagination
  searchAvailableRooms: async (query = "", page = 1, limit = 20) => {
    try {
      const response = await fetcher("/property/searchAvailableRooms", {
        body: JSON.stringify({
          query: query.trim(),
          page: page,
          limit: limit,
        }),
      })

      // Assuming similar structure for rooms
      const { propertyList, totalRooms } = response
      const totalCount = Number.parseInt(totalRooms, 10) || 0
      const hasMore = page * limit < totalCount

      const transformedRooms = propertyList.map((room) => ({
        roomId: room.roomId,
        roomName: room.roomName || "",
        propertyName: room.propertyName || "",
        propertyAddress: room.propertyAddress || "",
        _original: room,
      }))

      return {
        rooms: transformedRooms,
        totalCount,
        hasMore,
        page,
        success: true,
      }
    } catch (error) {
      console.error("Error in propertyAPI.searchAvailableRooms:", error)

      return {
        rooms: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        success: false,
        error: {
          message: error.response?.data?.message || "Failed to search rooms",
          status: error.response?.status,
        },
      }
    }
  },
  searchOwners: async (query = "", page = 1, limit = 20, mode = "") => {
    try {
      const response = await fetcher("/property/getAllPropertyOwners", {
        body: JSON.stringify({
          query: query.trim(),
          page: page,
          limit: limit,
          mode: mode, // You can define modes like "ACTIVE", "INACTIVE", "ALL" if needed
        }),
      })

      const { propertyOwnerList, totalOwner } = response

      // Validate response structure
      if (!Array.isArray(propertyOwnerList)) {
        throw new Error("Invalid response: ownerList is not an array")
      }

      const totalCount = Number.parseInt(totalOwner, 10) || 0
      const hasMore = page * limit < totalCount

      // Transform OwnerVO (or whatever your backend returns) to standardized format
      const transformedOwners = propertyOwnerList.map((owner) => {
        // Validate required fields (optional, but good for debugging)
        if (!owner.ownerId) {
          console.warn("Owner missing ownerId:", owner)
        }

        return {
          ownerId: owner.ownerId || `temp_${Date.now()}_${Math.random()}`, // Fallback ID
          fullName: owner.fullName || "",
          email: owner.email || "", // Assuming emailAddress from backend
          contactNo: owner.contactNo || "",
          // Include any other fields you might need from the owner object
          _original: owner, // Keep original data for reference if needed
        }
      })

      return {
        owners: transformedOwners,
        totalCount,
        hasMore,
        page,
        success: true,
      }
    } catch (error) {
      console.error("Error in propertyAPI.searchOwners:", error)
      // Return standardized error response
      return {
        owners: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        success: false,
        error: {
          message: error.response?.data?.message || error.message || "Failed to search property owners",
          status: error.response?.status,
          code: error.code,
        },
      }
    }
  },
  searchProperties: async (query = "", page = 1, limit = 20) => {
    const response = await fetcher("/property/searchProperty", {
        body: JSON.stringify({
          query: query.trim(),
          page: page,
          limit: limit,
        }),
      })

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginated = response.propertyList.slice(startIndex, endIndex)

    return {
      success: true,
      properties: paginated,
      totalCount: response.totalProperties,
      page: page,
      hasMore: endIndex < response.propertyList.length,
    }
  },
}

export const rentalAPI = {
  searchRentals: async (query = "", page = 1, limit = 20) => {
      const response = await fetcher("/rental/searchRental", {
        body: JSON.stringify({
          query: query.trim(),
          page: page,
          limit: limit,
        }),
      })

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginated = response.rentalList.slice(startIndex, endIndex)

    return {
      success: true,
      rentals: paginated,
      totalCount: response.totalRental,
      page: page,
      hasMore: endIndex < response.length,
    }
  },

  updateRental: async (rentalData) => {
    await fetcher("/rental/updateRental", {
        body: JSON.stringify({
          rentalId: rentalData.id,
          rentalStartDate: rentalData.rentalStartDate,
          rentalEndDate: rentalData.rentalEndDate,
          monthlyAmount: rentalData.monthlyAmount,
        }),
      })

    return { success: true, message: "Rental agreement updated successfully!" }
  },

  deleteRental: async (rentalId, remark) => {
    try{
    const response = await fetcher("/rental/deleteRental", {
        body: JSON.stringify({
          rentalId: rentalId,
          remark: remark,
        }),
      })

    return { success: true, message: `Rental agreement ${rentalId} deleted successfully!` }
    }catch(error){
    return { success: false, message: error.response?.data?.message || error.message || "Failed to delete." }
    }
  },
}
export const billAPI = {
  getBillTypes: async () => {
    const response = await fetcher("/common/getParams", {
        body: JSON.stringify({
          paramCategory: "BILL_PAYMENT",
        }),
      })

    return {
      success: true,
      billTypes: response.sysparamList,
    }
  },

  // Get bills for tenant by rental ID
  getTenantBills: async (rentalId) => {
    try {
      const response = await fetcher("/payment/retrieveTenantBill", {
        body: JSON.stringify({
          rentalId: rentalId,
        }),
      })

      return {
        success: true,
        bills: response.billList || [],
      }
    } catch (error) {
      console.error("Error fetching tenant bills:", error)
      return {
        success: false,
        bills: [],
        error: error.message || "Failed to fetch bills",
      }
    }
  },

  // Upload receipt for a bill
  uploadReceipt: async (billId, file) => {
    try {
      const formData = new FormData()
      formData.append("billId", billId)
      formData.append("receipt", file)

      const response = await fetch("/payment/uploadReceipt", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.responseStatus === "0") {
        throw new Error(data.message || "Upload failed")
      }

      return {
        success: true,
        message: data.message || "Receipt uploaded successfully!",
      }
    } catch (error) {
      console.error("Error uploading receipt:", error)
      return {
        success: false,
        error: error.message || "Failed to upload receipt",
      }
    }
  },

  createBills: async (rentalId, bills) => {
    const response = await fetcher("/payment/createBill", {
        body: JSON.stringify({
          rentalId: rentalId,
          billList: bills,
        }),
      })

    return {
      success: true,
      message: `${bills.length} bill(s) created successfully for rental ${rentalId}!`,
      createdBills: bills.map((bill, index) => ({
        ...bill,
        billId: `BILL${Date.now()}${index}`,
        createdOn: new Date().toISOString(),
      })),
    }
  },
  getBillsByRental: async (rentalId) => {
    const response = await fetcher("/payment/retrieveBill", {
        body: JSON.stringify({
          rentalId: rentalId,
        }),
      })

    return {
      success: true,
      bills: response.billList,
    }
  },

  updateBill: async (billId, billData) => {
    await fetcher("/payment/editBill", {
        body: JSON.stringify({
          billId: billId,
          billType: billData.billType,
          amount: billData.amount,
          billMonth: billData.billMonth,
          remark: billData.remarks,
        }),
      })

    return {
      success: true,
      message: `Bill ${billId} updated successfully!`,
    }
  },

  deleteBill: async (billId) => {
     await fetcher("/payment/deleteBill", {
        body: JSON.stringify({
          billId: billId,
        }),
      })
    return {
      success: true,
      message: `Bill ${billId} deleted successfully!`,
    }
  },

  getTenantBills: async (rentalId) => {
    try {
      const response = await fetcher("/payment/retrieveBill", {
        body: JSON.stringify({
          rentalId: rentalId,
        }),
      })

      return {
        success: true,
        bills: response.billList || [],
      }
    } catch (error) {
      console.error("Error fetching tenant bills:", error)
      return {
        success: false,
        bills: [],
        error: error.message || "Failed to fetch bills",
      }
    }
  },

  // Upload receipt for a bill
  uploadReceipt: async (billId, file) => {
    try {
      const formData = new FormData()
      formData.append("billId", billId)
      formData.append("receipt", file)

      const response = await fetch("/payment/uploadReceipt", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.responseStatus === "0") {
        throw new Error(data.message || "Upload failed")
      }

      return {
        success: true,
        message: data.message || "Receipt uploaded successfully!",
      }
    } catch (error) {
      console.error("Error uploading receipt:", error)
      return {
        success: false,
        error: error.message || "Failed to upload receipt",
      }
    }
  },
}

export const approveBillAPI = {
  // Search bills for approval with pagination
  searchBillsForApproval: async (searchTerm = "", page = 1, limit = 20) => {
    try {
      const response = await fetcher("/payment/retrieveBillsReceipt", {
        body: JSON.stringify({
          query: searchTerm,
          page: page,
          limit: limit,
        }),
      })

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedBills = response.billReceipts.slice(startIndex, endIndex)

      return {
        success: true,
        bills: paginatedBills,
        totalCount: response.totalRecords,
        hasMore: endIndex < response.billReceipts.length,
        page: page,
      }
    } catch (error) {
      console.error("Error searching bills for approval:", error)
      return {
        success: false,
        error: "Failed to search bills for approval",
      }
    }
  },

  getReceiptImage: async (imgPath) => {
    try {
      const imageUrl = await fetchImg(`/payment/files/${imgPath}`)

      return {
        success: true,
        imageUrl: imageUrl,
      }
    } catch (error) {
      console.error("Error getting receipt image:", error)
      return {
        success: false,
        error: "Failed to load receipt image",
      }
    }
  },

  // Approve bill
  approveBill: async (receiptId, billId, username) => {
    try {
      const response = await fetcher("/payment/approveBill", {
        body: JSON.stringify({
          action: "APPROVE",
          billId: billId,
          receiptId: receiptId,
          actionBy: username
        }),
      })

      return {
        success: true,
        message: `Receipt ${receiptId} approved successfully!`,
      }
    } catch (error) {
      console.error("Error approving bill:", error)
      return {
        success: false,
        error: "Network error occurred while approving bill",
      }
    }
  },

  // Reject bill
  rejectBill: async (receiptId, billId, username) => {
    try {
      const response = await fetcher("/payment/approveBill", {
        body: JSON.stringify({
          action: "REJECT",
          billId: billId,
          receiptId: receiptId,
          actionBy: username
        }),
      })

      return {
        success: true,
        message: `Receipt ${receiptId} rejected successfully!`,
      }
    } catch (error) {
      console.error("Error rejecting bill:", error)
      return {
        success: false,
        error: "Network error occurred while rejecting bill",
      }
    }
  },
}

export const schedulerAPI = {
  // Get all schedulers
  getSchedulers: async () => {
    try {
      const response = await get("/system/getAllSchedulers")

      return {
        success: true,
        data: response.schedulerList,
        message: "Schedulers retrieved successfully",
      }
    } catch (error) {
      console.error("Error fetching schedulers:", error)
      throw new Error("Failed to fetch schedulers")
    }
  },

  getSchedulerHistory: async (schedulerId) => {
    const response = await fetcher("/system/getSchedulerHistory", {
        body: JSON.stringify({
          schedulerId: schedulerId,
        }),
      })

    return {
      success: true,
      data: response.taskHistoryList,
      message: "Scheduler history loaded successfully",
    }
  },

  // Manual trigger scheduler
  triggerScheduler: async (schedulerId) => {
    try{
    const response = await fetcher("/system/manualTrigger", {
        body: JSON.stringify({
          schedulerId: schedulerId,
        }),
      })

      return {
        success: true,
        message: `Scheduler with ID "${schedulerId}" triggered successfully`,
      }
    }catch(error){
        throw new Error("Failed to trigger scheduler. Please try again.")
    }
  },
}
