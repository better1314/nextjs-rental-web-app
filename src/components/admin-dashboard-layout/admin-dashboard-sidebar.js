"use client"

import { useState, useEffect } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Mountain, Home, Building, Users, FileText, UserPlus, Plus, ChevronDown, User, FileCog, DollarSign, MonitorCog, Clock, Signature} from "lucide-react"
import { usePathname } from "next/navigation"

// Admin sidebar menu structure with collapsible sections
const menuSections = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    url: "/admin/dashboard",
    type: "single",
  },
  {
    id: "property",
    title: "Property Management",
    icon: Building,
    type: "collapsible",
    items: [
      {
        title: "Add Property",
        icon: Plus,
        url: "/admin/add-property",
      },
      {
        title: "Edit Property Owner",
        icon: User,
        url: "/admin/edit-property-owner",
      },
      {
        title: "Edit Property",
        icon: User,
        url: "/admin/edit-property",
      },
    ],
  },
  {
    id: "user",
    title: "User Management",
    icon: Users,
    type: "collapsible",
    items: [
      {
        title: "Create New Admin",
        icon: UserPlus,
        url: "/admin/create-admin",
      },
      {
        title: "Edit User",
        icon: User,
        url: "/admin/edit-user",
      },
    ],
  },
  {
    id: "rental",
    title: "Rental Management",
    icon: FileText,
    type: "collapsible",
    items: [
      {
        title: "Create Rental",
        icon: FileText,
        url: "/admin/create-rental",
      },
      {
        title: "Edit Rental",
        icon: FileCog,
        url: "/admin/edit-rental",
      },
      {
        title: "Create Bill",
        icon: DollarSign,
        url: "/admin/create-bill",
      },
      {
        title: "Edit Bill",
        icon: FileCog,
        url: "/admin/edit-bill",
      },
      {
        title: "Approve Bill",
        icon: Signature,
        url: "/admin/approve-bill",
      },
    ],
  },
  {
    id: "system",
    title: "System Maintenance",
    icon: MonitorCog,
    type: "collapsible",
    items: [
      {
        title: "Check Scheduler",
        icon: Clock,
        url: "/admin/check-scheduler",
      },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  // State to track which sections are open
  const [openSections, setOpenSections] = useState({})

  // Initialize open sections based on current path
  useEffect(() => {
    const initialOpenSections = {}

    menuSections.forEach((section) => {
      if (section.type === "collapsible") {
        // Open the section if the current path matches any of its items
        const shouldBeOpen = section.items?.some((item) => pathname === item.url)
        if (shouldBeOpen) {
          initialOpenSections[section.id] = true
        }
      }
    })

    setOpenSections(initialOpenSections)
  }, [pathname])

  // Toggle a section's open state
  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  // Handle section header click
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSection(sectionId)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center space-x-2 p-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mountain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">RentEase</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuSections.map((section) => {
                if (section.type === "single") {
                  // Single menu item (Dashboard)
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton asChild isActive={pathname === section.url}>
                        <a href={section.url}>
                          <section.icon className="w-4 h-4" />
                          <span>{section.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                } else {
                  // Collapsible menu section
                  const isOpen = openSections[section.id] || false

                  return (
                    <SidebarMenuItem key={section.id}>
                      <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="w-full cursor-pointer"
                            onClick={(e) => handleSectionClick(e, section.id)}
                          >
                            <section.icon className="w-4 h-4" />
                            <span>{section.title}</span>
                            <ChevronDown
                              className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="transition-all duration-200 ease-in-out">
                          <SidebarMenuSub>
                            {section.items?.map((item) => (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                                  <a href={item.url}>
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
