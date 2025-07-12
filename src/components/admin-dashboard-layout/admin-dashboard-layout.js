"use client"

import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { AdminSidebar } from "./admin-dashboard-sidebar"
import { useRouter } from "next/navigation"
import { sessionUtils } from "@/common/session"

export function AdminDashboardLayout({ children }) {
  const router = useRouter()

  const handleLogout = () => {
    sessionUtils.clearSession()
    router.push("/")
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
