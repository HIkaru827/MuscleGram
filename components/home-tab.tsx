"use client"

import { useState } from "react"
import { Heart, MessageCircle, Share, MoreHorizontal, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Post {
  id: string
  user: {
    name: string
    username: string
    avatar: string
  }
  image: string
  exercises: Array<{
    name: string
    sets: number
    reps: number
    weight: number
  }>
  likes: number
  comments: number
  isLiked: boolean
  timestamp: string
}

const mockPosts: Post[] = [
  {
    id: "1",
    user: {
      name: "田中太郎",
      username: "tanaka_muscle",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    image: "/placeholder.svg?height=300&width=300",
    exercises: [
      { name: "ベンチプレス", sets: 3, reps: 10, weight: 80 },
      { name: "インクラインプレス", sets: 3, reps: 12, weight: 60 },
    ],
    likes: 24,
    comments: 5,
    isLiked: false,
    timestamp: "2時間前",
  },
  {
    id: "2",
    user: {
      name: "佐藤花子",
      username: "sato_fit",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    image: "/placeholder.svg?height=300&width=300",
    exercises: [
      { name: "スクワット", sets: 4, reps: 15, weight: 50 },
      { name: "レッグプレス", sets: 3, reps: 12, weight: 100 },
    ],
    likes: 18,
    comments: 3,
    isLiked: true,
    timestamp: "4時間前",
  },
]

export default function HomeTab() {
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [searchQuery, setSearchQuery] = useState("")

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Search Bar */}
      <div className="p-4 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-6 h-6" />
          <Input
            placeholder="ユーザーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Posts Feed */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-0">
          {posts.map((post) => (
            <Card key={post.id} className="rounded-lg border border-gray-200 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.user.avatar || "/placeholder.svg"} alt={post.user.name} />
                      <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{post.user.name}</p>
                      <p className="text-gray-500 text-xs">@{post.user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-xs">{post.timestamp}</span>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Workout Image */}
                <div className="mb-4">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt="Workout"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>

                {/* Exercise Details */}
                <div className="mb-4 space-y-2">
                  {post.exercises.map((exercise, index) => (
                    <div key={index} className="bg-white rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{exercise.name}</span>
                        <div className="text-xs text-gray-600">
                          {exercise.sets}セット × {exercise.reps}回 × {exercise.weight}kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="flex items-center space-x-1 p-0 h-auto"
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
                      <span className="text-sm">{post.likes}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1 p-0 h-auto">
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-sm">{post.comments}</span>
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    <Share className="w-5 h-5 text-gray-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
