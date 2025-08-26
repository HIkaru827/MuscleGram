"use client"

import { useState, useEffect, useRef } from "react"
import { Settings, Edit, Users, Award, LogOut, Bell, Shield, Camera, CalendarIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { getPosts } from "@/lib/firestore"
import { WorkoutPost } from "@/types"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { uploadImage, validateImageFile, compressImage } from "@/lib/storage"
import NotificationSettings from "./notification-settings"

export default function ProfileScreen() {
  const { user, userProfile, logout } = useAuth()
  const [userPosts, setUserPosts] = useState<WorkoutPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: ""
  })
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    averageDuration: 0,
    favoriteExercise: ""
  })

  useEffect(() => {
    if (user && userProfile) {
      setEditForm({
        displayName: userProfile.displayName || "",
        bio: userProfile.bio || ""
      })
    }
  }, [user, userProfile])

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      // Check if we're in demo mode
      const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
      
      if (isDemoMode) {
        // Create demo posts
        const demoPosts: WorkoutPost[] = []
        setUserPosts(demoPosts)
        setStats({ totalWorkouts: 15, totalVolume: 12500, averageDuration: 52, favoriteExercise: 'ベンチプレス' })
        setLoading(false)
        return
      }

      try {
        // Load user's posts
        const posts = await getPosts(user.uid, 50)
        setUserPosts(posts)

        // Calculate stats
        const totalWorkouts = posts.length
        const totalVolume = posts.reduce((sum, post) => {
          return sum + post.exercises.reduce((exerciseSum, exercise) => {
            return exerciseSum + exercise.sets.reduce((setSum, set) => {
              return setSum + (set.weight * set.reps)
            }, 0)
          }, 0)
        }, 0)

        const averageDuration = totalWorkouts > 0 
          ? Math.round(posts.reduce((sum, post) => sum + post.duration, 0) / totalWorkouts)
          : 0

        // Find favorite exercise
        const exerciseCounts: Record<string, number> = {}
        posts.forEach(post => {
          post.exercises.forEach(exercise => {
            exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1
          })
        })

        const favoriteExercise = Object.entries(exerciseCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || ""

        setStats({
          totalWorkouts,
          totalVolume,
          averageDuration,
          favoriteExercise
        })

      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user])

  const handleProfileUpdate = async () => {
    if (!user || !userProfile) return

    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        displayName: editForm.displayName,
        bio: editForm.bio,
        updatedAt: new Date()
      })

      toast.success("プロフィールを更新しました")
      setEditingProfile(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("プロフィールの更新に失敗しました")
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) {
      toast.error("ファイルが選択されていないか、ユーザー情報がありません")
      return
    }

    console.log('Starting photo upload:', { fileName: file.name, fileSize: file.size, fileType: file.type })
    setUploadingPhoto(true)

    try {
      // Validate file
      console.log('Validating file...')
      validateImageFile(file)
      console.log('File validation passed')

      // Compress image
      console.log('Compressing image...')
      const compressedFile = await compressImage(file, 400, 0.8)
      console.log('Image compression completed', { originalSize: file.size, compressedSize: compressedFile.size })

      // Upload to storage
      console.log('Uploading to Firebase Storage...')
      const photoURL = await uploadImage(compressedFile, `profile-photos/${user.uid}`)
      console.log('Upload successful, URL:', photoURL)

      // Update user profile in Firestore
      console.log('Updating user profile in Firestore...')
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        photoURL,
        updatedAt: new Date()
      })
      console.log('Profile update completed')

      toast.success("プロフィール写真を更新しました")
    } catch (error: any) {
      console.error('Photo upload error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        error: error
      })
      
      // More specific error messages
      if (error.code === 'storage/unauthorized') {
        toast.error("ストレージへのアクセス権限がありません。ログインし直してください。")
      } else if (error.code === 'storage/canceled') {
        toast.error("アップロードがキャンセルされました")
      } else if (error.code === 'storage/unknown') {
        toast.error("不明なエラーが発生しました。再度お試しください。")
      } else {
        toast.error(error.message || "写真のアップロードに失敗しました")
      }
    } finally {
      setUploadingPhoto(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
      toast.error("ログアウトに失敗しました")
    }
  }

  if (!user || !userProfile) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">ログインしてください</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={userProfile.photoURL || "/placeholder.svg"} alt={userProfile.displayName} />
                <AvatarFallback className="bg-red-100 text-red-600 text-xl">
                  {userProfile.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{userProfile.displayName || 'ユーザー'}</h1>
                  <p className="text-gray-600">{userProfile.email}</p>
                </div>
                <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>プロフィール編集</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-col items-center space-y-2">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={userProfile.photoURL || "/placeholder.svg"} alt={userProfile.displayName} />
                          <AvatarFallback className="bg-red-100 text-red-600 text-lg">
                            {userProfile.displayName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="text-sm"
                        >
                          {uploadingPhoto ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent mr-2" />
                              アップロード中...
                            </>
                          ) : (
                            <>
                              <Camera className="h-3 w-3 mr-2" />
                              写真を変更
                            </>
                          )}
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="displayName">表示名</Label>
                        <Input
                          id="displayName"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">自己紹介</Label>
                        <Textarea
                          id="bio"
                          placeholder="自己紹介を入力してください..."
                          value={editForm.bio}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleProfileUpdate} className="flex-1">
                          保存
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingProfile(false)}
                          className="flex-1"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="mt-2">
                <p className="text-gray-700">
                  {userProfile.bio || "まだ自己紹介が設定されていません。"}
                </p>
              </div>
              
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {userProfile.createdAt 
                      ? format(userProfile.createdAt.toDate(), 'yyyy年MM月', { locale: ja })
                      : '参加日不明'}から参加
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-600">ワークアウト</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(stats.totalVolume / 1000).toFixed(1)}t
            </div>
            <div className="text-sm text-gray-600">総ボリューム</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.averageDuration}</div>
            <div className="text-sm text-gray-600">平均時間(分)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-bold text-gray-900">
              {stats.favoriteExercise || "データなし"}
            </div>
            <div className="text-sm text-gray-600">人気種目</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {userPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">まだ投稿がありません</h3>
                <p className="text-gray-500">ワークアウトを記録して投稿してみましょう！</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <Card key={post.id} className="border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">
                        {post.createdAt && format(post.createdAt.toDate(), 'MM月dd日 HH:mm', { locale: ja })}
                      </span>
                      <Badge variant="outline">{post.duration}分</Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      {post.exercises.map((exercise, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">{exercise.name}</span>
                            <span className="text-sm text-gray-500">{exercise.sets.length}セット</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {exercise.sets.slice(0, 3).map((set, setIndex) => (
                              <div key={setIndex} className="text-center p-2 bg-white rounded">
                                <div className="font-medium text-red-600">{set.weight}kg</div>
                                <div className="text-gray-600">{set.reps}回</div>
                              </div>
                            ))}
                            {exercise.sets.length > 3 && (
                              <div className="text-center p-2 bg-white rounded text-gray-500">
                                +{exercise.sets.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {post.comment && (
                      <p className="text-gray-700 text-sm">{post.comment}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>👍 {post.likes}</span>
                        <span>💬 {post.comments}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* トレーニング通知設定 */}
          <NotificationSettings />
          
          {/* その他の設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>一般設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">SNS通知</p>
                  <p className="text-sm text-gray-600">新しいフォロワーやいいねの通知</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">プライベート投稿</p>
                  <p className="text-sm text-gray-600">投稿を非公開にする</p>
                </div>
                <Switch />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}