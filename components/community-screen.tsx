"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Users, Calendar, Plus, Send, ImageIcon, MapPin, UserCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { User } from "@/types"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

export default function CommunityScreen() {
  const { user } = useAuth()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCommunityData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Load all users
        const usersRef = collection(db, 'users')
        const usersQuery = query(
          usersRef,
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const usersSnapshot = await getDocs(usersQuery)
        
        const users: User[] = []
        usersSnapshot.forEach((doc) => {
          if (doc.id !== user.uid) { // Exclude current user
            users.push({ uid: doc.id, ...doc.data() } as User)
          }
        })

        setAllUsers(users)
        
        // Set recently joined users as "active"
        setActiveUsers(users.slice(0, 10))

      } catch (error) {
        console.error('Error loading community data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCommunityData()
  }, [user])

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">ログインしてください</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">コミュニティ</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">ユーザー</TabsTrigger>
          <TabsTrigger value="discussions">フォーラム</TabsTrigger>
          <TabsTrigger value="events">イベント</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Active Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span>新しいメンバー</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">まだアクティブなユーザーがいません</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeUsers.map((member) => (
                    <div key={member.uid} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.photoURL || "/placeholder.svg"} alt={member.displayName} />
                        <AvatarFallback className="bg-red-100 text-red-600">
                          {member.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{member.displayName || 'Unknown User'}</p>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            新規
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.bio && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{member.bio}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>投稿: {member.postsCount || 0}</span>
                          <span>フォロワー: {member.followers || 0}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <UserCheck className="w-4 h-4 mr-1" />
                        フォロー
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Users */}
          <Card>
            <CardHeader>
              <CardTitle>全てのメンバー ({allUsers.length}名)</CardTitle>
            </CardHeader>
            <CardContent>
              {allUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">まだメンバーがいません</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {allUsers.map((member) => (
                      <div key={member.uid} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.photoURL || "/placeholder.svg"} alt={member.displayName} />
                            <AvatarFallback className="bg-red-100 text-red-600">
                              {member.displayName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{member.displayName || 'Unknown User'}</p>
                            <p className="text-sm text-gray-600">
                              参加: {member.createdAt 
                                ? format(member.createdAt.toDate(), 'yyyy/MM', { locale: ja })
                                : '不明'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right text-sm text-gray-500">
                            <div>投稿 {member.postsCount || 0}</div>
                          </div>
                          <Button variant="outline" size="sm">
                            フォロー
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span>フォーラム</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">フォーラム機能は準備中です</h3>
                <p className="text-gray-500 mb-4">
                  近日中にディスカッション機能を追加予定です！<br />
                  トレーニングに関する質問や情報交換ができるようになります。
                </p>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  新しいトピック
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>イベント</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">イベント機能は準備中です</h3>
                <p className="text-gray-500 mb-4">
                  近日中にイベント機能を追加予定です！<br />
                  グループワークアウトやチャレンジイベントに参加できるようになります。
                </p>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  イベント作成
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}