import { fetcher } from "@/common/webclient"

const DUMMY_BILL_TYPES = [
  { id: "RENT", name: "Monthly Rent"},
  { id: "UTIL", name: "Utilities"},
  { id: "MAINT", name: "Maintenance Fee", description: "Property maintenance and upkeep" },
  { id: "DEPOSIT", name: "Security Deposit", description: "Refundable security deposit" },
  { id: "LATE", name: "Late Payment Fee", description: "Penalty for late payment" },
  { id: "CLEAN", name: "Cleaning Fee", description: "Professional cleaning service" },
  { id: "REPAIR", name: "Repair Charges", description: "Property repair and restoration" },
  { id: "OTHER", name: "Other Charges", description: "Miscellaneous charges" },
]

const DUMMY_RENTALS = [
  {
    id: "RENT001",
    rentalStartDate: "2024-01-01",
    rentalEndDate: "2024-12-31",
    rentalStatus: "ACTIVE",
    roomId: "R001",
    roomName: "Master Bedroom",
    propertyName: "Greenwood Residence",
    propertyAddress: "123, Jalan Hijau, Taman Indah, 50000 Kuala Lumpur",
    fullName: "John Doe",
    contactNo: "+60123456789",
    nric: "901234-56-7890",
    email: "john.doe@example.com",
  },
  {
    id: "RENT002",
    rentalStartDate: "2024-02-15",
    rentalEndDate: "2025-02-14",
    rentalStatus: "ACTIVE",
    roomId: "A101",
    roomName: "Studio",
    propertyName: "Blue Sky Apartment",
    propertyAddress: "45, Lorong Biru, Bandar Baru, 40000 Shah Alam",
    fullName: "Jane Smith",
    contactNo: "+60198765432",
    nric: "851234-56-7891",
    email: "jane.smith@example.com",
  },
  {
    id: "RENT003",
    rentalStartDate: "2024-03-01",
    rentalEndDate: "2024-08-31",
    rentalStatus: "EXPIRED",
    roomId: "V201",
    roomName: "Bedroom 1",
    propertyName: "Sunset Villa",
    propertyAddress: "789, Persiaran Senja, Bukit Damai, 60000 Petaling Jaya",
    fullName: "Peter Jones",
    contactNo: "+60112233445",
    nric: "921234-56-7892",
    email: "peter.jones@example.com",
  },
  {
    id: "RENT004",
    rentalStartDate: "2024-04-01",
    rentalEndDate: "2025-03-31",
    rentalStatus: "ACTIVE",
    roomId: "C301",
    roomName: "Bedroom A",
    propertyName: "Riverfront Condo",
    propertyAddress: "10, Lebuh Sungai, Taman Air, 70000 Seremban",
    fullName: "Alice Wonderland",
    contactNo: "+60176543210",
    nric: "881234-56-7893",
    email: "alice.w@example.com",
  },
  {
    id: "RENT005",
    rentalStartDate: "2024-05-15",
    rentalEndDate: "2024-11-14",
    rentalStatus: "TERMINATED",
    roomId: "B401",
    roomName: "Master Suite",
    propertyName: "Hilltop Bungalow",
    propertyAddress: "5, Jalan Puncak, Desa Bukit, 80000 Johor Bahru",
    fullName: "Bob The Builder",
    contactNo: "+60134567890",
    nric: "901234-56-7894",
    email: "bob.b@example.com",
  },
]

export const userAPI = {
  // Search users with pagination
  searchUsers: async (query = "", page = 1, limit = 20, mode = "") => {
    try {
      const response = await fetcher("http://localhost:8081/user/searchUserList", {
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
      const response = await fetcher("http://localhost:8081/property/searchAvailableRooms", {
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
      // Assuming your Spring Boot backend has an endpoint like /property/searchOwnerList
      // that accepts query, page, limit, and mode, and returns ownerList and totalOwner.
      const response = await fetcher("http://localhost:8081/property/getAllPropertyOwners", {
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
    const response = await fetcher("http://localhost:8081/property/searchProperty", {
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
      const response = await fetcher("http://localhost:8081/rental/searchRental", {
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
    await fetcher("http://localhost:8081/rental/updateRental", {
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
    const response = await fetcher("http://localhost:8081/rental/deleteRental", {
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
    const response = await fetcher("http://localhost:8081/common/getParams", {
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
      const response = await fetcher("http://localhost:8081/payment/retrieveTenantBill", {
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

      const response = await fetch("http://localhost:8081/payment/uploadReceipt", {
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
    const response = await fetcher("http://localhost:8081/payment/createBill", {
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
    const response = await fetcher("http://localhost:8081/payment/retrieveBill", {
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
    await fetcher("http://localhost:8081/payment/editBill", {
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
     await fetcher("http://localhost:8081/payment/deleteBill", {
        body: JSON.stringify({
          billId: billId,
        }),
      })
    return {
      success: true,
      message: `Bill ${billId} deleted successfully!`,
    }
  },
}
