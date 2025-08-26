"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { 
  getAllTrainingRecommendations, 
  formatRecommendationMessage, 
  getStatusColor,
  NextRecommendation 
} from "@/lib/training-analytics"
import { NotificationManager } from "@/lib/notification-manager"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface NextTrainingRecommendationsProps {
  onExerciseSelect?: (exerciseName: string) => void
  showAll?: boolean
  maxItems?: number
}

export default function NextTrainingRecommendations({ 
  onExerciseSelect, 
  showAll = false, 
  maxItems = 5 
}: NextTrainingRecommendationsProps) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<NextRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllItems, setShowAllItems] = useState(showAll)

  useEffect(() => {
    if (user) {
      loadRecommendations()
    }
  }, [user])

  const loadRecommendations = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const recs = await getAllTrainingRecommendations(user.uid)
      setRecommendations(recs)
      
      // Schedule notifications for recommendations
      const notificationManager = NotificationManager.getInstance()
      recs.forEach(rec => {
        if (rec.status === 'due_soon' || rec.status === 'on_track') {
          notificationManager.scheduleTrainingNotification(
            rec.exerciseName,
            rec.nextRecommendedDate
          )
        }
      })
    } catch (error) {
      console.error('Error loading training recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConsistencyBadge = (consistency: NextRecommendation['consistency']) => {
    const badges = {
      high: { text: '安定', color: 'bg-green-100 text-green-800' },
      medium: { text: '普通', color: 'bg-yellow-100 text-yellow-800' },
      low: { text: '不安定', color: 'bg-red-100 text-red-800' }
    }
    
    return badges[consistency]
  }

  const getStatusIcon = (status: NextRecommendation['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'due_soon':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'on_track':
        return <Calendar className="w-4 h-4 text-green-600" />
      case 'ahead':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            推奨トレーニング日程がありません
          </h3>
          <p className="text-gray-500 text-sm">
            複数回の記録後に推奨日程が表示されます
          </p>
        </CardContent>
      </Card>
    )
  }

  const displayedRecommendations = showAllItems 
    ? recommendations 
    : recommendations.slice(0, maxItems)

  const urgentRecommendations = recommendations.filter(
    rec => rec.status === 'overdue' || rec.status === 'due_soon'
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>次回トレーニング推奨日</span>
          </div>
          {urgentRecommendations > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              緊急 {urgentRecommendations}件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {displayedRecommendations.map((recommendation, index) => {
          const consistencyBadge = getConsistencyBadge(recommendation.consistency)
          const statusColors = getStatusColor(recommendation.status)
          
          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer",
                statusColors
              )}
              onClick={() => onExerciseSelect?.(recommendation.exerciseName)}
            >
              {/* Header - Compact layout */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {recommendation.exerciseName}
                  </h4>
                  <Badge className={`text-xs ${consistencyBadge.color}`}>
                    {consistencyBadge.text}
                  </Badge>
                </div>
                {getStatusIcon(recommendation.status)}
              </div>

              {/* Main message - More compact */}
              <p className="text-xs font-medium mb-2 text-gray-700">
                {formatRecommendationMessage(recommendation)}
              </p>

              {/* Details - Simplified */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  前回: {format(recommendation.lastTrainingDate, 'M/d', { locale: ja })}
                </span>
                <span>
                  推奨: {format(recommendation.nextRecommendedDate, 'M/d', { locale: ja })}
                </span>
              </div>

              {/* Progress indicator - Compact */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      recommendation.status === 'overdue' && "bg-red-500",
                      recommendation.status === 'due_soon' && "bg-orange-500", 
                      recommendation.status === 'on_track' && "bg-green-500",
                      recommendation.status === 'ahead' && "bg-blue-500"
                    )}
                    style={{ 
                      width: `${Math.min(100, Math.max(0, 
                        ((Date.now() - recommendation.lastTrainingDate.getTime()) / 
                         (recommendation.nextRecommendedDate.getTime() - recommendation.lastTrainingDate.getTime())) * 100
                      ))}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Show more button */}
        {!showAllItems && recommendations.length > maxItems && (
          <div className="text-center pt-3">
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setShowAllItems(true)}
            >
              他 {recommendations.length - maxItems} 件を表示
            </Button>
          </div>
        )}

        {/* Refresh button */}
        <div className="flex justify-end pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRecommendations}
          >
            更新
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}