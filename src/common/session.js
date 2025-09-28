import { cryptoUtils } from "@/common/crypto"
const SESSION_KEY = "rentease_user_session"

export const sessionUtils = {
  // Save user session after login
  saveSession: async (userData) => {
    try {
      const sessionData = {
        user: userData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }
      const encrypted = await cryptoUtils.encryptData(sessionData);

      localStorage.setItem(SESSION_KEY, JSON.stringify(encrypted))
      return true
    } catch (error) {
      console.error("Error saving session:", error)
      return false
    }
  },

  // Get current session
  getSession: async () => {
    try {
      const encryptedSessionData = localStorage.getItem(SESSION_KEY)
      if (!encryptedSessionData) return null

      const parsed = JSON.parse(encryptedSessionData)
      const sessionData = await cryptoUtils.decryptData(parsed);
      console.log("Decrypted session data:", sessionData);
      if (!sessionData) return null;

      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        sessionUtils.clearSession()
        return null
      }

      return sessionData
    } catch (error) {
      console.error("Error getting session:", error)
      return null
    }
  },

  // Get user from session
  getUser: async () => {
    const session = await sessionUtils.getSession()
    
    return session ? session.user : null
  },

  // Check if user is admin
  isAdmin: async () => {
    const user = await sessionUtils.getUser()
    return user && user.roleCode === "A"
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    return await sessionUtils.getSession() !== null
  },

  // Clear session (logout)
  clearSession: () => {
    try {
      localStorage.removeItem(SESSION_KEY)
      return true
    } catch (error) {
      console.error("Error clearing session:", error)
      return false
    }
  },

  // Update session data
  updateSession: (userData) => {
    const currentSession = sessionUtils.getSession()
    if (currentSession) {
      currentSession.user = { ...currentSession.user, ...userData }
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession))
      return true
    }
    return false
  },
}
