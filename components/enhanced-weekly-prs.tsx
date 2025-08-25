"use client"

import { useState } from "react"
import { Settings, Calendar, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PRRecord, getPRCategory, PR_CATEGORIES } from "@/lib/pr-utils"
import { format, formatDistanceToNow, startOfDay, isSameDay } from "date-fns"
import { ja } from "date-fns/locale"

// スパークラインコンポーネント
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
}

function Sparkline({ data, width = 60, height = 20, className }: SparklineProps) {
  if (data.length < 2) return null
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// 集約されたPRデータ型
interface ConsolidatedPR {
  exerciseName: string
  date: Date
  mainPR: PRRecord // 最も重要なPR
  otherPRs: PRRecord[] // その他のPR（最大2個）
  category: string
  muscleGroup: string
  sparklineData?: number[]
}

// 日付セクション型
interface DateSection {
  date: Date
  label: string
  prs: ConsolidatedPR[]
}

interface EnhancedWeeklyPRsProps {
  weeklyPRs: PRRecord[]
  onTrendClick?: (exerciseName: string, prType: PRRecord['prType']) => void
}

// 筋肉群マッピング
const getMuscleGroupFromExercise = (exerciseName: string): string => {
  const mapping: Record<string, string> = {
    'ベンチプレス': '胸',
    'インクラインプレス': '胸',
    'ディクラインプレス': '胸',
    'ダンベルフライ': '胸',
    'チェストプレス': '胸',
    '懸垂': '背中',
    'デッドリフト': '背中',
    'ラットプルダウン': '背中',
    'ベントオーバーロー': '背中',
    'スクワット': '脚',
    'レッグプレス': '脚',
    'レッグエクステンション': '脚',
    'バーベルカール': '腕',
    'ハンマーカール': '腕',
    'トライセプスエクステンション': '腕',
    'ディップス': '腕',
    'プリーチャーカール': '腕',
    'ショルダープレス': '肩',
    'サイドレイズ': '肩',
    'リアレイズ': '肩',
    'フロントレイズ': '肩',
    'アップライトロー': '肩',
  }
  
  return mapping[exerciseName] || '胸'
}

// PRの重要度を計算（高いほど重要）
const getPRPriority = (pr: PRRecord): number => {
  const priorities = {
    'e1RM': 100,
    '3RM': 90,
    '5RM': 80,
    '8RM': 70,
    'weight_reps': 60,
    'session_volume': 50,
  }
  
  const basePriority = priorities[pr.prType] || 0
  const improvementBonus = (pr.improvement || 0) * 2
  
  return basePriority + improvementBonus
}

// PRタイプの表示名
const getPRDisplayName = (prType: string): string => {
  const names: Record<string, string> = {
    'e1RM': 'e1RM',
    '3RM': '3RM',
    '5RM': '5RM', 
    '8RM': '8RM',
    'weight_reps': '重量×回数',
    'session_volume': '総重量',
  }
  
  return names[prType] || prType
}

// PRの値を表示用にフォーマット
const formatPRValue = (pr: PRRecord): string => {
  switch (pr.prType) {
    case 'e1RM':
    case '3RM':
    case '5RM':
    case '8RM':
      return `${pr.value.toFixed(1)} kg`
    case 'weight_reps':
      return `${pr.weight}kg×${pr.reps}`
    case 'session_volume':
      return `${(pr.value / 1000).toFixed(1)}t`
    default:
      return `${pr.value}`
  }
}

// カテゴリカラー（左縦線用）
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'max_strength': 'border-purple-500',
    'endurance': 'border-blue-500',  
    'volume': 'border-green-500',
  }
  
  return colors[category] || 'border-gray-300'
}

export default function EnhancedWeeklyPRs({ weeklyPRs, onTrendClick }: EnhancedWeeklyPRsProps) {
  const [showAll, setShowAll] = useState(false)
  
  if (weeklyPRs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">まだPRがありません</h2>
          <p className="text-gray-500">ワークアウトを記録してPRを達成しましょう！</p>
        </CardContent>
      </Card>
    )
  }

  // PRデータを種目別・日付別に集約
  const consolidatePRs = (): DateSection[] => {
    // まず種目×日付でグループ化
    const grouped = new Map<string, PRRecord[]>()
    
    weeklyPRs.forEach(pr => {
      // 0.5%未満の改善は除外
      if (pr.improvement && pr.improvement < 0.5) return
      
      const dateKey = format(pr.date, 'yyyy-MM-dd')
      const key = `${pr.exerciseName}_${dateKey}`
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(pr)
    })
    
    // 集約されたPRを作成
    const consolidated: ConsolidatedPR[] = []
    
    grouped.forEach((prs, key) => {
      if (prs.length === 0) return
      
      // 最も重要なPRを選択
      const mainPR = prs.reduce((best, current) => 
        getPRPriority(current) > getPRPriority(best) ? current : best
      )
      
      // その他のPR（最大2個）
      const otherPRs = prs
        .filter(pr => pr.id !== mainPR.id)
        .sort((a, b) => getPRPriority(b) - getPRPriority(a))
        .slice(0, 2)
      
      const category = getPRCategory(mainPR.prType)
      const muscleGroup = getMuscleGroupFromExercise(mainPR.exerciseName)
      
      // スパークライン用のダミーデータ（実装時は過去データから取得）
      const sparklineData = [75, 78, 80, 82, 85, mainPR.value]
      
      consolidated.push({
        exerciseName: mainPR.exerciseName,
        date: mainPR.date,
        mainPR,
        otherPRs,
        category,
        muscleGroup,
        sparklineData
      })
    })
    
    // 日付別にセクション分け
    const sections = new Map<string, ConsolidatedPR[]>()
    const today = startOfDay(new Date())
    
    consolidated.forEach(pr => {
      const prDate = startOfDay(pr.date)
      let sectionKey: string
      
      if (isSameDay(prDate, today)) {
        sectionKey = 'today'
      } else {
        const daysAgo = Math.floor((today.getTime() - prDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysAgo <= 7) {
          sectionKey = `${daysAgo}days`
        } else {
          sectionKey = 'older'
        }
      }
      
      if (!sections.has(sectionKey)) {
        sections.set(sectionKey, [])
      }
      sections.get(sectionKey)!.push(pr)
    })
    
    // セクションを作成
    const dateSections: DateSection[] = []
    
    // 今日
    if (sections.has('today')) {
      dateSections.push({
        date: today,
        label: '今日',
        prs: sections.get('today')!.sort((a, b) => getPRPriority(b.mainPR) - getPRPriority(a.mainPR))
      })
    }
    
    // 過去の日付
    for (let i = 1; i <= 7; i++) {
      const key = `${i}days`
      if (sections.has(key)) {
        const sectionDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        dateSections.push({
          date: sectionDate,
          label: format(sectionDate, 'M月d日', { locale: ja }),
          prs: sections.get(key)!.sort((a, b) => getPRPriority(b.mainPR) - getPRPriority(a.mainPR))
        })
      }
    }
    
    return dateSections
  }
  
  const dateSections = consolidatePRs()
  const totalPRs = weeklyPRs.filter(pr => !pr.improvement || pr.improvement >= 0.5).length
  
  // カテゴリ別統計
  const categoryStats = {
    max_strength: weeklyPRs.filter(pr => getPRCategory(pr.prType) === 'max_strength').length,
    endurance: weeklyPRs.filter(pr => getPRCategory(pr.prType) === 'endurance').length,
    volume: weeklyPRs.filter(pr => getPRCategory(pr.prType) === 'volume').length,
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>今週のPR {totalPRs}件</span>
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          最大強度{categoryStats.max_strength}／持久{categoryStats.endurance}／総量{categoryStats.volume}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {dateSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* セクション見出し */}
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="font-medium text-gray-900">
                {section.label}（{section.prs.length}）
              </h3>
            </div>
            
            {/* PRカード */}
            <div className="space-y-3">
              {section.prs.map((consolidatedPR, prIndex) => {
                const categoryColor = getCategoryColor(consolidatedPR.category)
                const categoryInfo = PR_CATEGORIES[consolidatedPR.category as keyof typeof PR_CATEGORIES]
                
                return (
                  <div 
                    key={prIndex}
                    className={cn(
                      "relative pl-4 pr-3 py-3 bg-gray-50 rounded-lg border-l-4",
                      categoryColor
                    )}
                  >
                    {/* メインコンテンツ */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* ヘッダー */}
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {consolidatedPR.exerciseName}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {format(consolidatedPR.date, 'M/d', { locale: ja })}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {consolidatedPR.muscleGroup}
                          </Badge>
                        </div>
                        
                        {/* メインPR */}
                        <div className="flex items-baseline space-x-2 mb-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {formatPRValue(consolidatedPR.mainPR)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {getPRDisplayName(consolidatedPR.mainPR.prType)}
                          </span>
                          {consolidatedPR.mainPR.improvement && consolidatedPR.mainPR.improvement > 0 && (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              +{consolidatedPR.mainPR.improvement.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        
                        {/* その他のPR */}
                        {consolidatedPR.otherPRs.length > 0 && (
                          <div className="flex items-center space-x-3 text-sm text-gray-600">
                            {consolidatedPR.otherPRs.map((pr, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                <span>•</span>
                                <span>{getPRDisplayName(pr.prType)}</span>
                                {pr.improvement && pr.improvement > 0 && (
                                  <span className="text-green-600">
                                    +{pr.improvement.toFixed(1)}%
                                  </span>
                                )}
                                <span>{formatPRValue(pr)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* スパークライン */}
                      <div className="flex items-center space-x-2">
                        {consolidatedPR.sparklineData && (
                          <div className="text-right">
                            <Sparkline 
                              data={consolidatedPR.sparklineData} 
                              className="text-gray-400" 
                            />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTrendClick?.(consolidatedPR.exerciseName, consolidatedPR.mainPR.prType)}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        >
                          <TrendingUp className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}