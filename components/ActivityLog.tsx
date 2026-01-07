

import type { ActivityLog as ActivityLogType } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ArrowRight, UserCheck, Clock, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ActivityLogProps {
  activities: ActivityLogType[]
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_created":
        return <Plus className="h-4 w-4 text-emerald-600" />
      case "task_updated":
        return <Edit className="h-4 w-4 text-blue-600" />
      case "task_deleted":
        return <Trash2 className="h-4 w-4 text-rose-600" />
      case "stage_moved":
        return <ArrowRight className="h-4 w-4 text-violet-600" />
      case "assignment_changed":
        return <UserCheck className="h-4 w-4 text-amber-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task_created":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "task_updated":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "task_deleted":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "stage_moved":
        return "bg-violet-50 text-violet-700 border-violet-200"
      case "assignment_changed":
        return "bg-amber-50 text-amber-700 border-amber-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case "task_created":
        return "bg-emerald-100 border-emerald-200"
      case "task_updated":
        return "bg-blue-100 border-blue-200"
      case "task_deleted":
        return "bg-rose-100 border-rose-200"
      case "stage_moved":
        return "bg-violet-100 border-violet-200"
      case "assignment_changed":
        return "bg-amber-100 border-amber-200"
      default:
        return "bg-slate-100 border-slate-200"
    }
  }

  return (
    <Card className="shadow-lg border-0  h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl font-bold dark:text-gray-300 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          Activity Log
        </CardTitle>
        <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-violet-600 rounded-full"></div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16  rounded-full flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No recent activity</p>
              <p className="text-slate-400 text-sm mt-1">Activities will appear here as they happen</p>
            </div>
          ) : (
            <>
              {activities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="group relative flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards'
                  }}
                >
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-8 top-16 w-px h-6 bg-gradient-to-b from-slate-200 to-transparent"></div>
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 p-2.5 rounded-xl border-2 ${getActivityIconBg(activity.type)} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-7 w-7 ring-2 ring-white shadow-sm">
                        {/* <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} /> */}
                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-slate-100 to-slate-200">
                          {activity.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                          {activity.user.name}
                        </span>
                        <Badge className={`text-xs font-medium px-2.5 py-1 border ${getActivityColor(activity.type)} group-hover:shadow-sm transition-all`}>
                          {activity.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-700 leading-relaxed mb-2 group-hover:text-slate-800 transition-colors">
                      {activity.description}
                    </p>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span className="group-hover:text-slate-600 transition-colors">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
      
      {/* Custom styles for animations and scrollbar */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        
        .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225);
          border-radius: 2px;
        }
        
        // .scrollbar-track-transparent::-webkit-scrollbar-track {
        //   background: transparent;
        // }
      `}</style>
    </Card>
  )
}