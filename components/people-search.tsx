



"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTeamUsers } from "@/hooks/use-team-users";



export default function PeopleSearch({ users: allUsers, departments, currentUser }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [baseUsers, setBaseUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { users: teamUsers, loading: teamUsersLoading } = useTeamUsers();

  // Filter users based on role (manager sees only subordinates, admin vs employee)
  useEffect(() => {
    if (currentUser?.user?.role) {
      let usersToDisplay: any[] = [];

      if (currentUser.user.role === "MANAGER") {
        // Managers see only their subordinates
        usersToDisplay = teamUsers || [];
      } else if (currentUser.user.role === "EMPLOYEE") {
        // Employees see only their department members
        usersToDisplay = (allUsers || []).filter(
          (user: any) => user.departmentId === currentUser.user.departmentId
        );
      } else {
        // Admins see all users
        usersToDisplay = allUsers || [];
      }

      setBaseUsers(usersToDisplay);
      setFilteredUsers(usersToDisplay);
    }
  }, [allUsers, currentUser, teamUsers]);

  // Apply search filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = baseUsers.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
      setFilteredUsers(result);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, baseUsers]);

  function getDepartmentColor(departmentName: string) {
    switch (departmentName?.toLowerCase()) {
      case "engineering":
        return "bg-blue-100 text-blue-800";
      case "hr":
        return "bg-green-100 text-green-800";
      case "sales":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  return (
    <div className="dark:bg-gray-900" >
      <div className="relative mb-6 dark:bg-gray-900">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:bg-gray-900" />
        <Input
          placeholder="Search people"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* View toggle (card / list) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              viewMode === 'card'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              viewMode === 'list'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            List
          </button>
        </div>
        <div className="text-sm text-gray-500">{filteredUsers.length} people</div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All People</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
        </TabsList>

        {/* All People Tab */}
        <TabsContent value="all">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>All People</CardTitle>
              <CardDescription>
                All people in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <p className="text-center text-sm text-gray-500">No people found.</p>
              ) : viewMode === 'card' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 ">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 ">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex items-center mt-1">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.department && (
                              <Badge className={`ml-2 ${getDepartmentColor(user.department.name)}`}>
                                {user.department.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button variant="outline" size="sm" asChild className="w-full dark:bg-gray-900">
                          <Link href={`/dashboard/messages/${user.id}`}>Message</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="hidden sm:flex sm:items-center">
                          <Badge variant="outline">{user.role}</Badge>
                          {user.department && (
                            <Badge className={`ml-2 ${getDepartmentColor(user.department.name)}`}>
                              {user.department.name}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/messages/${user.id}`}>Message</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Department Tab */}
        <TabsContent value="departments">
          <div className="space-y-6 dark:bg-gray-900">
            {(currentUser.user.role === "EMPLOYEE"
              ? departments?.filter(
                (d: any): any => (d as any).id === currentUser.user.departmentId
              )
              : departments
            )?.map((department: any): any => {
              const [isOpen, setIsOpen] = useState(false); // Not allowed here, see note below

              return (
                <Card key={department.id} className="dark:bg-gray-900">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setIsOpen((prev) => !prev)}
                  >
                    <CardTitle className="flex justify-between items-center">
                      <span>{department.name}</span>
                      <span className="text-sm text-gray-500">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </CardTitle>
                    {isOpen && (
                      <CardDescription>
                        {department.users.length} people
                      </CardDescription>
                    )}
                  </CardHeader>

                  {isOpen && (
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {(department as any).users.map((user: any): any => (
                          <div
                            key={user.id}
                            className="border rounded-lg p-4 "
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                {user.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-500">
                                  {user.email}
                                </p>
                                <Badge variant="outline" className="mt-1">
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3 flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="w-full dark:bg-gray-900"
                              >
                                <Link href={`/dashboard/messages/${user.id}`}>
                                  Message
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


