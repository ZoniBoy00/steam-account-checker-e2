"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface ProgressDisplayProps {
  progress: number
  currentAccount: number
  totalAccounts: number
}

export function ProgressDisplay({ progress, currentAccount, totalAccounts }: ProgressDisplayProps) {
  return (
    <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
          <span className="text-sm font-medium text-slate-200">Checking Steam Accounts...</span>
        </div>
        <Badge variant="outline" className="border-blue-600 text-blue-400">
          {currentAccount} / {totalAccounts}
        </Badge>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-slate-400">
        Processing account {currentAccount} of {totalAccounts} ({Math.round(progress)}% complete)
      </p>
    </div>
  )
}
