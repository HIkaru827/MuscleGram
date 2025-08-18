"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PRRecord, formatPRDate, getPRCategory, PR_CATEGORIES } from "@/lib/pr-utils"

interface PRTrendModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  prType: PRRecord['prType']
  trendData: PRRecord[]
}

/**
 * PR Trend Modal Component
 * 
 * Displays historical PR trend data as a line chart
 * Shows the last 3-6 PR records for a specific exercise and PR type
 * 
 * API Specification:
 * - Input: exerciseName (string), prType (PRRecord['prType']), trendData (PRRecord[])
 * - Response: Interactive line chart with date on X-axis and PR value on Y-axis
 * - Data points show improvement trends over time
 * 
 * @param isOpen - Modal visibility state
 * @param onOpenChange - Modal state change handler
 * @param exerciseName - Name of the exercise
 * @param prType - Type of PR (e1RM, 3RM, etc.)
 * @param trendData - Array of historical PR records (max 6 entries)
 */
export default function PRTrendModal({ 
  isOpen, 
  onOpenChange, 
  exerciseName,
  prType,
  trendData 
}: PRTrendModalProps) {
  if (!trendData.length) return null

  const category = getPRCategory(prType)
  const categoryInfo = PR_CATEGORIES[category]

  // Prepare chart data
  const chartData = trendData
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((pr, index) => ({
      index: index + 1,
      date: formatPRDate(pr.date),
      fullDate: pr.date.toLocaleDateString('ja-JP'),
      value: pr.prType === 'session_volume' ? pr.value / 1000 : pr.value, // Convert volume to tons
      weight: pr.weight,
      reps: pr.reps,
      improvement: pr.improvement || 0
    }))

  const getValueLabel = (value: number) => {
    if (prType === 'session_volume') {
      return `${value.toFixed(1)}t`
    }
    if (prType === 'e1RM') {
      return `${value.toFixed(1)}kg`
    }
    return `${value}kg`
  }

  const getYAxisDomain = () => {
    const values = chartData.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.1 || 1
    return [Math.max(0, min - padding), max + padding]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>{exerciseName} - {prType} トレンド</span>
            <Badge className={`text-xs ${categoryInfo.color}`}>
              {categoryInfo.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  domain={getYAxisDomain()}
                  tickFormatter={(value) => getValueLabel(value)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                          <div className="font-medium text-gray-900 mb-2">{label}</div>
                          <div className="text-sm space-y-1">
                            <div>記録: {getValueLabel(data.value)}</div>
                            {data.weight && data.reps && (
                              <div>詳細: {data.weight}kg × {data.reps}回</div>
                            )}
                            {data.improvement > 0 && (
                              <div className="text-green-600">
                                改善: +{data.improvement.toFixed(1)}%
                              </div>
                            )}
                            <div className="text-gray-500">{data.fullDate}</div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#dc2626', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-sm text-blue-600 mb-1">記録回数</div>
              <div className="text-2xl font-bold text-blue-800">{trendData.length}回</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-sm text-green-600 mb-1">最高記録</div>
              <div className="text-2xl font-bold text-green-800">
                {getValueLabel(Math.max(...chartData.map(d => d.value)))}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-sm text-purple-600 mb-1">総改善</div>
              <div className="text-2xl font-bold text-purple-800">
                {trendData.length >= 2 
                  ? `+${((chartData[chartData.length - 1].value - chartData[0].value) / chartData[0].value * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Recent Records List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>直近の記録</span>
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {trendData
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((pr, index) => (
                  <div key={pr.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium">
                        #{trendData.length - index}
                      </div>
                      <div className="text-sm">
                        {formatPRDate(pr.date)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="font-medium">
                        {prType === 'e1RM' && `${pr.value.toFixed(1)}kg`}
                        {prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                        {prType === 'session_volume' && `${(pr.value / 1000).toFixed(1)}t`}
                        {['3RM', '5RM', '8RM'].includes(prType) && `${pr.weight}kg`}
                      </div>
                      {pr.improvement && pr.improvement > 0 && (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          +{pr.improvement.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}