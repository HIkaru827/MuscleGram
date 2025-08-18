"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Target, TrendingUp } from "lucide-react"
import { PRRecord, calculatePRRecommendation, getPRCategory, PR_CATEGORIES } from "@/lib/pr-utils"
import { formatPRDate } from "@/lib/pr-utils"

interface PRRecommendationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  prs: PRRecord[]
}

/**
 * PR Recommendation Modal Component
 * 
 * Displays newly achieved PRs with next target recommendations
 * Shows improvement percentage and suggested next goals
 * 
 * @param isOpen - Modal visibility state
 * @param onOpenChange - Modal state change handler  
 * @param prs - Array of newly achieved PR records
 */
export default function PRRecommendationModal({ 
  isOpen, 
  onOpenChange, 
  prs 
}: PRRecommendationModalProps) {
  if (prs.length === 0) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex items-center justify-center space-x-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span>次の目標設定</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center text-gray-600 mb-4">
            {prs.length}件のPR達成！次の目標を設定しましょう
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {prs.map((pr) => {
              const recommendation = calculatePRRecommendation(pr)
              const category = getPRCategory(pr.prType)
              const categoryInfo = PR_CATEGORIES[category]
              
              return (
                <div key={pr.id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="space-y-3">
                    {/* Exercise and Category */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">{pr.exerciseName}</span>
                        <Badge className={`text-xs ${categoryInfo.color}`}>
                          {categoryInfo.name}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPRDate(pr.date)}
                      </div>
                    </div>
                    
                    {/* Current Achievement */}
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">今回の達成</span>
                        {pr.improvement && pr.improvement > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            +{pr.improvement.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {pr.prType === 'e1RM' && `e1RM: ${pr.value.toFixed(2)}kg`}
                        {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                        {pr.prType === 'session_volume' && `総重量: ${(pr.value / 1000).toFixed(1)}t`}
                        {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.weight}kg (${pr.prType})`}
                      </div>
                    </div>
                    
                    {/* Next Target Recommendation */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">次回推奨目標</span>
                      </div>
                      <div className="text-blue-900 font-semibold mb-2">
                        {recommendation.message}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Calendar className="w-3 h-3" />
                        <span>推奨日: {recommendation.targetDate?.toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              了解！次回頑張ります
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}