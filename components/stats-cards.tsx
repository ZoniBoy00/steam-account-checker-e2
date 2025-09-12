"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, CheckCircle, XCircle, Clock, Ban, DollarSign } from "lucide-react"
import type { CheckStats } from "@/lib/types"

interface StatsCardsProps {
  stats: CheckStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Accounts",
      value: stats.total,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      percentage: 100,
    },
    {
      title: "Valid Accounts",
      value: stats.valid,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
      percentage: stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0,
    },
    {
      title: "Invalid Accounts",
      value: stats.invalid,
      icon: XCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
      percentage: stats.total > 0 ? Math.round((stats.invalid / stats.total) * 100) : 0,
    },
    {
      title: "Expired Tokens",
      value: stats.expired,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
      percentage: stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0,
    },
    {
      title: "VAC Banned",
      value: stats.vac_banned,
      icon: Shield,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
      percentage: stats.total > 0 ? Math.round((stats.vac_banned / stats.total) * 100) : 0,
    },
    {
      title: "Community Banned",
      value: stats.community_banned,
      icon: Ban,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
      percentage: stats.total > 0 ? Math.round((stats.community_banned / stats.total) * 100) : 0,
    },
    {
      title: "Economy Banned",
      value: stats.economy_banned,
      icon: DollarSign,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      percentage: stats.total > 0 ? Math.round((stats.economy_banned / stats.total) * 100) : 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`hover:shadow-lg transition-all duration-200 hover:scale-105 bg-slate-800/50 border-slate-700 ${card.bgColor} ${card.borderColor}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-300 leading-tight">{card.title}</CardTitle>
            <div className={`p-1.5 sm:p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-1">
              <div className={`text-lg sm:text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-slate-400">{card.percentage}% of total</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
