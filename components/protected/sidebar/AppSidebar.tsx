"use client";

import Image from "next/image";
import * as React from "react";
import { useTheme } from "next-themes";
import {
  LayoutGrid,
  PackageSearch,
  Calendar,
  Ticket,
  Users,
  Building2,
  FileText,
  Wallet2,
  Settings,
  Database,
  Factory,
  HelpCircle,
  Search,
  Map,
  TrendingUp
} from "lucide-react";

import { NavDocuments } from "@/components/protected/sidebar/nav-documents";
import { NavMain } from "@/components/protected/sidebar/nav-main";
import { NavSecondary } from "@/components/protected/sidebar/nav-secondary";
import { UserCard } from "@/components/protected/sidebar/user-card";
import { useUser } from "@/lib/hooks/use-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutGrid,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: PackageSearch,
      items: [
        {
          title: "Suppliers",
          url: "/suppliers",
        },
        {
          title: "Contracts",
          url: "/contracts",
        },
        {
          title: "Products",
          url: "/products",
        },
        {
          title: "Events",
          url: "/events",
        },

      ],
    },
    {
      title: "Sales",
      url: "/sales",
      icon: Ticket,
      items: [
        {
          title: "Quotes",
          url: "/quotes",
        },
        {
          title: "Bookings",
          url: "/bookings",
        },
      ],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      items: [
        {
          title: "Contacts",
          url: "/contacts",
        },
        {
          title: "Agents",
          url: "/agents",
        },
      ],
    },
    {
      title: "Finance",
      url: "/finance",
      icon: Wallet2,
      items: [
        {
          title: "Payments",
          url: "/payments",
        },
        {
          title: "Supplier Payables",
          url: "/payables",
        },
        {
          title: "Commissions",
          url: "/commissions",
        },
      ],
    },
  ],
  navDocuments: [
    {
      name: "Operations",
      url: "/operations",
      icon: Factory,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      name: "Analytics",
      url: "/analytics",
      icon: TrendingUp,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "/help",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "/search",
      icon: Search,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading } = useUser()
  const { theme } = useTheme()
  const userData = {
    name:
      user && (user.first_name || user.last_name)
        ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
        : user?.email ?? (loading ? 'Loading…' : 'User'),
    email: user?.email || '',
    avatar: user?.avatar_url,
    organization: user?.organization?.name || 'Organization',
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="border-none"
    >
      <SidebarHeader className="p-4">
        <a href="/">
                <Image src={theme === "dark" ? "/newlight.png" : "/newdark.png"} alt="Pandora" width={150} height={150} />  
              </a>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.navDocuments} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <UserCard
          name={userData.name}
          email={userData.email}
          avatar={userData.avatar}
          organization={userData.organization}
        />
      </SidebarFooter>
    </Sidebar>
  )
}


