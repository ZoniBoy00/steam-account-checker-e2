"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bell, X, Trash2, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface Notification {
  id: string
  title: string
  description: string
  variant: "success" | "error" | "warning" | "info"
  timestamp: Date
  read: boolean
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function NotificationCenter({ notifications, onMarkAsRead, onDelete, onClearAll }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  console.log("[v0] NotificationCenter render:", {
    notificationCount: notifications.length,
    unreadCount,
    isOpen,
  })

  const getIcon = (variant: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "info":
        return <Info className="h-4 w-4 text-blue-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case "success":
        return "border-green-500/30 bg-green-500/10"
      case "error":
        return "border-red-500/30 bg-red-500/10"
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "info":
        return "border-blue-500/30 bg-blue-500/10"
      default:
        return "border-blue-500/30 bg-blue-500/10"
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const handleTriggerClick = () => {
    console.log("[v0] Notification bell clicked, current isOpen:", isOpen)
    setIsOpen(!isOpen)
  }

  const handleOpenChange = (open: boolean) => {
    console.log("[v0] Popover open state changed to:", open)
    setIsOpen(open)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-slate-400 hover:text-slate-200"
          onClick={handleTriggerClick}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-slate-800 border-slate-700" align="end" sideOffset={5}>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-200">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </CardTitle>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 p-3">
                  {notifications
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-all hover:bg-slate-700/30 ${getVariantStyles(
                          notification.variant,
                        )} ${!notification.read ? "ring-1 ring-blue-500/30" : ""}`}
                        onClick={() => !notification.read && onMarkAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {getIcon(notification.variant)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-slate-200 truncate">{notification.title}</h4>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">{notification.description}</p>
                              <p className="text-xs text-slate-500 mt-1">{formatTime(notification.timestamp)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(notification.id)
                            }}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
