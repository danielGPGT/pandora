import { getCurrentUser } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/protected/sidebar/AppSidebar"
import { Header } from "@/components/protected/Header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/lib/providers/query-provider"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return (
    <QueryProvider>
      
      <SidebarProvider>
        <div className="min-h-screen w-full ">
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 min-w-0 flex flex-col w-full bg-sidebar">
              <Header />
              <main className="relative px-2 md:px-2 pb-2 md:pb-2 md:pl-2 bg-sidebar min-h-screen w-full overflow-hidden">
              
                <div className="relative rounded-xl overflow-hidden shadow-md min-h-screen bg-background w-full border">
                {/*<div className="z-0 pointer-events-none absolute top-[200px] left-[100px] w-[2000px] h-[2000px] rounded-full bg-[radial-gradient(closest-side,theme(colors.background),theme(colors.primary.800),theme(colors.background))] blur-3xl"/> 
              <div className="z-0 pointer-events-none absolute bottom-[-1000px] right-[-1000px] w-[2000px] h-[2000px] rounded-full bg-[radial-gradient(closest-side,theme(colors.background),theme(colors.primary.500),theme(colors.background))] blur-out-3xlxl"/> 
              <div className="z-1 absolute top-0 left-0 w-full h-full bg-background/50 backdrop-blur-3xl"></div> */}
                  <div className="relative z-2 p-4 md:p-8 w-full">
                    {children}
                    
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </SidebarProvider>
      <Toaster position="top-right" />
    </QueryProvider>
  )
}

