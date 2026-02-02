import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { BudgetItem, BudgetSummary } from "$lib/services/budget"

interface DashboardProps {
  items: BudgetItem[]
  summary: BudgetSummary
}

export function Dashboard({ items, summary }: DashboardProps) {
  const percentage = Math.round((summary.spent / summary.total) * 100)

  const data = [
    { name: "Budget", value: summary.total },
    { name: "Spent", value: summary.spent },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${summary.spent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-emerald-500">${summary.remaining.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Table */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Budget Items</CardTitle>
                    <CardDescription>Manage your project finances.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">Variance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Ordered' ? 'default' : 'secondary'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">${item.cost.toLocaleString()}</TableCell>
                                    <TableCell className={`text-right ${item.variance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {item.variance > 0 ? '+' : ''}{item.variance}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar - Chart */}
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Utilization</CardTitle>
                    <CardDescription>
                         {percentage}% of budget used
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={data}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ backgroundColor: '#101622', borderColor: '#1e293b' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1e293b' : '#135bec'} />
                                    ))}
                                </Bar>
                             </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
