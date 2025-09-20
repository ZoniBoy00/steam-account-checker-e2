"use client"

import { useState, useCallback } from "react"
import type { Notification } from "@/components/notification-center"

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (title: string, description: string, variant: "success" | "error" | "warning" | "info" = "info") => {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title,
        description,
        variant,
        timestamp: new Date(),
        read: false,
      }

      setNotifications((prev) => [notification, ...prev])
      return notification.id
    },
    [],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    markAsRead,
    deleteNotification,
    clearAll,
  }
}
