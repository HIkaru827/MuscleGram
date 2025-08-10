"use client"

import { useState } from "react"
import { Settings, Edit, Users, Calendar, Camera, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UserProfile {
  name: string
  username: string
  bio: string
  avatar: string
  followers: number
  following: number
  posts: number
  workouts: number
}

interface Post {
  id: string
  image: string
  date: string
  exercises: string[]
}

interface WorkoutRecord {
  id: string
  date: string
  exercises: Array<{
    name: string
    sets: number
    reps: number
    weight: number
  }>
  duration: number
}

const mockProfile: UserProfile = {
  name: "田中太郎",
  username: "tanaka_muscle",
  bio: "筋トレ歴3年  ベンチプレス100kg達成！\n目標：デッドリフト150kg",
  avatar: "/placeholder.svg?height=80&width=80",
  followers: 245,
  following: 189,
  posts: 67,
  workouts: 156,
}

const mockPosts: Post[] = [
  {
    id: "1",
    image: "/placeholder.svg?height=150&width=150",
    date: "2024-01-10",
    exercises: ["ベンチプレス", "インクラインプレス"],
  },
  {
    id: "2",
    image: "/placeholder.svg?height=150&width=150",
    date: "2024-01-08",
    exercises: ["デッドリフト", "ラットプルダウン"],
  },
  {
    id: "3",
    image: "/placeholder.svg?height=150&width=150",
    date: "2024-01-05",
    exercises: ["スクワット", "レッグプレス"],
  },
]

const mockWorkoutRecords: WorkoutRecord[] = [
  {
    id: "1",
    date: "2024-01-10",
    exercises: [
      { name: "ベンチプレス", sets: 3, reps: 10, weight: 80 },
      { name: "インクラインプレス", sets: 3, reps: 12, weight: 60 },
    ],
    duration: 75,
  },
  {
    id: "2",
    date: "2024-01-08",
    exercises: [
      { name: "デッドリフト", sets: 4, reps: 8, weight: 120 },
      { name: "ラットプルダウン", sets: 3, reps: 12, weight: 70 },
    ],
    duration: 90,
  },
]

export default function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile>(mockProfile)
  const [activeTab, setActiveTab] = useState("posts")

  return (
    <div className="max-w-md mx-auto">
      {/* Profile Header */}
      <div className="p-4 bg-gradient-to-r from-red-50 to-red-100">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} />
              <AvatarFallback className="text-lg">{profile.name[0]}</AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full p-0 bg-red-600 hover:bg-red-700"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <p className="text-gray-600 text-sm">@{profile.username}</p>
              </div>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-1" />
                編集
              </Button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{profile.bio}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{profile.posts}</div>
            <div className="text-xs text-gray-600">投稿</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{profile.workouts}</div>
            <div className="text-xs text-gray-600">ワークアウト</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{profile.followers}</div>
            <div className="text-xs text-gray-600">フォロワー</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{profile.following}</div>
            <div className="text-xs text-gray-600">フォロー中</div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border-b">
          <TabsTrigger value="posts" className="data-[state=active]:text-red-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
              <path d="M3 4a2 2 0 00-2 2v1.11a2 2 0 00.203 1.11l2.15 3.232a2 2 0 001.484.752l1.752.438a2 2 0 001.484.752l2.15 3.232A2 2 0 0011.889 15H17a2 2 0 002-2v-1.11a2 2 0 00-.203-1.11l-2.15-3.232a2 2 0 00-1.484-.752l-1.752-.438a2 2 0 00-1.484-.752l-2.15-3.232A2 2 0 008.111 5H3a1 1 0 000-2h14a1 1 0 000 2h-5.111a2 2 0 00-.203 1.11l-2.15 3.232a2 2 0 00-1.484.752l-1.752.438a2 2 0 00-1.484.752l-2.15 3.232A2 2 0 008.111 13H3a2 2 0 00-2 2v-1.11a2 2 0 00.203-1.11l2.15-3.232a2 2 0 001.484-.752l1.752-.438a2 2 0 001.484-.752l2.15-3.232A2 2 0 0011.889 7H3a2 2 0 00-2-2z" />
            </svg>
            投稿
          </TabsTrigger>
          <TabsTrigger value="records" className="data-[state=active]:text-red-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            記録
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:text-red-600 flex items-center justify-center">
            <Settings className="w-5 h-5 mr-2" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="grid grid-cols-3 gap-1 p-1">
              {mockPosts.map((post) => (
                <div key={post.id} className="aspect-square relative">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt="Post"
                    className="w-full h-full object-cover rounded-sm"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all rounded-sm" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="records" className="mt-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="p-4 space-y-4">
              {mockWorkoutRecords.map((record) => (
                <Card key={record.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{record.date}</CardTitle>
                      <Badge variant="secondary">{record.duration}分</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {record.exercises.map((exercise, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{exercise.name}</span>
                          <span className="text-gray-600">
                            {exercise.sets}セット × {exercise.reps}回 × {exercise.weight}kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <div className="p-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="w-5 h-5 mr-3" />
                  フォロー管理
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Button variant="ghost" className="w-full justify-start">
                  <Calendar className="w-5 h-5 mr-3" />
                  目標設定
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="w-5 h-5 mr-3" />
                  アプリ設定
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  ログアウト
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
