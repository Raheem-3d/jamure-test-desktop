"use client";

import type React from "react";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useSocket } from "@/hooks/use-socket";
import { NotificationsProvider } from "@/contexts/notifications-context";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { SocketProvider } from "@/lib/socket-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // ✅ Add this line

  // Initialize Socket.io connection
  useSocket();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <SocketProvider>
      <NotificationsProvider>
        <div className="flex h-screen bg-background ">
          {/* Desktop Sidebar */}
          <div
            className={`hidden md:flex transition-all duration-300 ${
              isCollapsed ? "w-20" : "w-64"
            }`}
          >
            {/* ✅ Use isCollapsed here */}
            <div className="flex flex-col flex-1 min-h-0 border-r bg-card">
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  isCollapsed={isCollapsed}
                  setIsCollapsed={setIsCollapsed}
                />
              </div>
            </div>
          </div>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <Dialog>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto">
                    <Sidebar />
                  </div>
                </div>
              </SheetContent>
            </Dialog>
          </Sheet>

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden dark:bg-gray-900">
            <div className=" md:hidden flex items-center justify-between p-4 border-b bg-card">
              {/* <Dialog>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Dialog> */}
            </div>
            <Header />
            <main className="flex-1 overflow-auto m-4 dark:bg-gray-900">
              {children}
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </SocketProvider>
  );
}
