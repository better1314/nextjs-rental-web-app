// Session management utilities

const SESSION_KEY = "rentease_user_session"

export const sessionUtils = {
  // Save user session after login
  saveSession: (userData) => {
    try {
      const sessionData = {
        user: userData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      return true
    } catch (error) {
      console.error("Error saving session:", error)
      return false
    }
  },

  // Get current session
  getSession: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) return null

      const parsed = JSON.parse(sessionData)

      // Check if session is expired
      if (Date.now() > parsed.expiresAt) {
        sessionUtils.clearSession()
        return null
      }

      return parsed
    } catch (error) {
      console.error("Error getting session:", error)
      return null
    }
  },

  // Get user from session
  getUser: () => {
    const session = sessionUtils.getSession()
    return session ? session.user : null
  },

  // Check if user is admin
  isAdmin: () => {
    const user = sessionUtils.getUser()
    return user && user.roleCode === "A"
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return sessionUtils.getSession() !== null
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
