"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, Search, Filter, ArrowUpDown, Copy, CheckCircle2, User } from "lucide-react"
import type { SteamAccount } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"

interface AccountTableProps {
  accounts: SteamAccount[]
}

export function AccountTable({ accounts }: AccountTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState<keyof SteamAccount>("accountNumber")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredAndSortedAccounts = useMemo(() => {
    return accounts
      .filter((account) => {
        const matchesSearch =
          account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.steamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.realName.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || account.status.toLowerCase() === statusFilter.toLowerCase()

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }

        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()

        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
  }, [accounts, searchTerm, statusFilter, sortField, sortDirection])

  const handleSort = (field: keyof SteamAccount) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const getStatusBadge = useMemo(
    () => (status: string) => {
      switch (status.toLowerCase()) {
        case "valid":
          return (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Valid</Badge>
          )
        case "invalid":
        case "session invalid":
          return (
            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
              Invalid
            </Badge>
          )
        case "invalid jwt":
          return (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">
              Invalid JWT
            </Badge>
          )
        case "expired":
          return (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
              Expired
            </Badge>
          )
        case "error":
          return (
            <Badge variant="outline" className="border-gray-500 text-gray-400">
              Error
            </Badge>
          )
        default:
          return (
            <Badge variant="outline" className="border-gray-500 text-gray-400">
              {status}
            </Badge>
          )
      }
    },
    [],
  )

  const getBanBadge = useMemo(
    () => (banned: boolean) => {
      return banned ? (
        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
          Yes
        </Badge>
      ) : (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">No</Badge>
      )
    },
    [],
  )

  const getEconomyBadge = useMemo(
    () => (economyBan: string) => {
      switch (economyBan.toLowerCase()) {
        case "none":
          return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">No</Badge>
        case "probation":
          return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Probation</Badge>
        case "banned":
          return (
            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
              Banned
            </Badge>
          )
        default:
          return (
            <Badge variant="outline" className="border-gray-500 text-gray-400">
              {economyBan}
            </Badge>
          )
      }
    },
    [],
  )

  const getRealNameDisplay = (realName: string) => {
    if (
      !realName ||
      realName === "Unknown" ||
      realName === "Not specified" ||
      realName === "Error" ||
      realName.trim() === ""
    ) {
      return (
        <div className="flex items-center gap-2 text-slate-500">
          <User className="h-3 w-3" />
          <span className="text-sm italic">Not specified</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-slate-300">
        <User className="h-3 w-3 text-blue-400" />
        <span className="font-medium">{realName}</span>
      </div>
    )
  }

  const formatSteamId = (steamId: string) => {
    if (steamId === "Unknown" || steamId === "Error" || !steamId) {
      return steamId
    }

    // For Steam IDs longer than 12 characters, show first 6 and last 6 with ellipsis
    if (steamId.length > 12) {
      return `${steamId.slice(0, 6)}...${steamId.slice(-6)}`
    }

    return steamId
  }

  const getSteamProfileUrl = (steamId: string) => {
    if (steamId === "Unknown" || steamId === "Error" || !steamId || steamId.length !== 17) {
      return null
    }
    return `https://steamcommunity.com/profiles/${steamId}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-600 text-slate-200 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-900/50 border-slate-600 text-slate-200">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="invalid jwt">Invalid JWT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-slate-400 text-center sm:text-left">
          Showing {filteredAndSortedAccounts.length} of {accounts.length} accounts
        </div>
      </div>

      <div className="block lg:hidden">
        <div className="space-y-3">
          {filteredAndSortedAccounts.map((account, index) => (
            <Card
              key={`${account.accountNumber}-${index}`}
              className="bg-slate-800/50 border-slate-600 hover:bg-slate-800/70 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-blue-400 font-semibold text-lg">#{account.accountNumber}</span>
                    {getStatusBadge(account.status)}
                  </div>
                  {getSteamProfileUrl(account.steamId) && (
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 hover:bg-slate-600">
                      <a
                        href={getSteamProfileUrl(account.steamId)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Steam Profile"
                      >
                        <ExternalLink className="h-4 w-4 text-blue-400" />
                      </a>
                    </Button>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wide">Username</span>
                        <div className="text-slate-200 font-medium mt-1">{account.username}</div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wide">Steam ID</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs text-slate-300 break-all">
                            {formatSteamId(account.steamId)}
                          </span>
                          {account.steamId !== "Unknown" &&
                            account.steamId !== "Error" &&
                            account.steamId.length === 17 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(account.steamId, `steam-mobile-${account.accountNumber}`)
                                }
                                className="h-6 w-6 p-0 hover:bg-slate-600 flex-shrink-0"
                                title="Copy full Steam ID"
                              >
                                {copiedId === `steam-mobile-${account.accountNumber}` ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3 text-slate-400" />
                                )}
                              </Button>
                            )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wide">Real Name</span>
                        <div className="mt-1">{getRealNameDisplay(account.realName)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Ban Status</div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs">VAC:</span>
                        {getBanBadge(account.vacBanned)}
                        {account.vacCount > 0 && <span className="text-xs text-slate-400">({account.vacCount})</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs">Community:</span>
                        {getBanBadge(account.communityBanned)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs">Economy:</span>
                        {getEconomyBadge(account.economyBanned)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Account Info</div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div>
                        <span className="text-slate-400">Created:</span> {account.accountCreated}
                      </div>
                      <div>
                        <span className="text-slate-400">Last Online:</span> {account.lastOnline}
                      </div>
                      <div>
                        <span className="text-slate-400">JWT Expires:</span> {account.expires}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-sm shadow-2xl">
        <table className="w-full border-collapse min-w-[1400px]">
          <thead>
            <tr className="border-b border-slate-600/50 bg-gradient-to-r from-slate-800/80 to-slate-700/60">
              <th className="text-left p-4 font-semibold text-slate-200 w-16">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("accountNumber")}
                  className="h-auto p-1 font-semibold text-slate-200 hover:text-blue-400 hover:bg-slate-600/50 rounded-md transition-all"
                >
                  # <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </th>
              <th className="text-left p-4 font-semibold text-slate-200 w-28">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("status")}
                  className="h-auto p-1 font-semibold text-slate-200 hover:text-blue-400 hover:bg-slate-600/50 rounded-md transition-all"
                >
                  Status <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </th>
              <th className="text-left p-4 font-semibold text-slate-200 w-48">Steam ID</th>
              <th className="text-left p-4 font-semibold text-slate-200 w-36">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("username")}
                  className="h-auto p-1 font-semibold text-slate-200 hover:text-blue-400 hover:bg-slate-600/50 rounded-md transition-all"
                >
                  Username <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </th>
              <th className="text-left p-4 font-semibold text-slate-200 w-40">Real Name</th>
              <th className="text-left p-4 font-semibold text-slate-200 w-24">Ban Status</th>
              <th className="text-left p-4 font-semibold text-slate-200 w-32">Account Info</th>
              <th className="text-left p-4 font-semibold text-slate-200 w-20">Profile</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAccounts.map((account, index) => (
              <tr
                key={`${account.accountNumber}-${index}`}
                className="border-b border-slate-700/30 hover:bg-gradient-to-r hover:from-slate-700/40 hover:to-slate-600/30 transition-all duration-200 group"
              >
                <td className="p-4">
                  <div className="flex items-center">
                    <span className="font-mono text-blue-400 font-bold text-lg bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                      #{account.accountNumber}
                    </span>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center">{getStatusBadge(account.status)}</div>
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm text-slate-300 bg-slate-700/30 px-2 py-1 rounded border border-slate-600/50"
                          title={account.steamId}
                        >
                          {formatSteamId(account.steamId)}
                        </span>
                        {account.steamId !== "Unknown" &&
                          account.steamId !== "Error" &&
                          account.steamId.length === 17 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(account.steamId, `steam-${account.accountNumber}`)}
                              className="h-7 w-7 p-0 hover:bg-slate-600/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy full Steam ID"
                            >
                              {copiedId === `steam-${account.accountNumber}` ? (
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-400" />
                              )}
                            </Button>
                          )}
                      </div>
                      {getSteamProfileUrl(account.steamId) && (
                        <a
                          href={getSteamProfileUrl(account.steamId)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-fit opacity-0 group-hover:opacity-100 transition-opacity"
                          title={getSteamProfileUrl(account.steamId)!}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Profile
                        </a>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center">
                    <span
                      className="font-semibold text-slate-200 bg-slate-700/20 px-3 py-1.5 rounded-md border border-slate-600/30"
                      title={account.username}
                    >
                      {account.username}
                    </span>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center">{getRealNameDisplay(account.realName)}</div>
                </td>

                <td className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-12">VAC:</span>
                      <div className="flex items-center gap-1">
                        {getBanBadge(account.vacBanned)}
                        {account.vacCount > 0 && <span className="text-xs text-slate-400">({account.vacCount})</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-12">Comm:</span>
                      {getBanBadge(account.communityBanned)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-12">Econ:</span>
                      {getEconomyBadge(account.economyBanned)}
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-700/20 rounded px-2 py-1 border border-slate-600/30">
                      <div className="text-slate-400 mb-1">Created:</div>
                      <div className="text-slate-300 font-medium">{account.accountCreated}</div>
                    </div>
                    <div className="bg-slate-700/20 rounded px-2 py-1 border border-slate-600/30">
                      <div className="text-slate-400 mb-1">Last Online:</div>
                      <div className="text-slate-300 font-medium">{account.lastOnline}</div>
                    </div>
                    <div className="bg-slate-700/20 rounded px-2 py-1 border border-slate-600/30">
                      <div className="text-slate-400 mb-1">JWT Expires:</div>
                      <div className="text-slate-300 font-medium">{account.expires}</div>
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center justify-center">
                    {account.profileUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-9 w-9 p-0 hover:bg-blue-500/20 hover:border-blue-500/30 border border-transparent transition-all rounded-lg"
                      >
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Steam Profile"
                        >
                          <ExternalLink className="h-4 w-4 text-blue-400" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-slate-500 text-sm bg-slate-700/20 px-2 py-1 rounded border border-slate-600/30">
                        N/A
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedAccounts.length === 0 && accounts.length > 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No accounts match your search criteria. Try adjusting your filters or search terms.
        </div>
      )}
    </div>
  )
}
