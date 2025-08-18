"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Share, MoreHorizontal, Search, Filter, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/AuthContext"
import { WorkoutPost as WorkoutPostType } from "@/types"
import { subscribeToTimelinePosts, toggleLike, getUser, deletePost } from "@/lib/firestore"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { toast } from "sonner"

export default function HomeScreen() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<WorkoutPostType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleLike = async (postId: string) => {
    if (!user) return
    
    try {
      const newIsLiked = await toggleLike(postId, user.uid)
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: newIsLiked ? post.likes + 1 : post.likes - 1,
                likedBy: newIsLiked 
                  ? [...(post.likedBy || []), user.uid]
                  : (post.likedBy || []).filter(uid => uid !== user.uid)
              }
            : post
        )
      )
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleDeletePost = async () => {
    if (!user || !postToDelete) return

    setDeleting(true)
    try {
      await deletePost(postToDelete, user.uid)
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postToDelete))
      
      // Dispatch custom event to notify other components about post deletion
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId: postToDelete } }))
      
      toast.success("投稿を削除しました")
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || "投稿の削除に失敗しました")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setPostToDelete(null)
    }
  }

  const openDeleteDialog = (postId: string) => {
    setPostToDelete(postId)
    setShowDeleteDialog(true)
  }

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToTimelinePosts(async (firestorePosts) => {
      // Fetch user data for each post
      const postsWithUserData = await Promise.all(
        firestorePosts.map(async (post) => {
          if (!post.user) {
            const userData = await getUser(post.userId)
            return { ...post, user: userData }
          }
          return post
        })
      )
      setPosts(postsWithUserData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">ログインしてください</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search and Filter Bar */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="ユーザーや種目を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200 focus:border-red-300 focus:ring-red-200"
            />
          </div>
          <Button variant="outline" size="icon" className="border-gray-200 hover:bg-gray-50 bg-transparent">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Posts Timeline */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 p-4">
          {posts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              投稿がまだありません
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={post.user?.photoURL || "/placeholder.svg"} alt={post.user?.displayName || 'User'} />
                        <AvatarFallback className="bg-red-100 text-red-600">{post.user?.displayName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">{post.user?.displayName || 'Unknown User'}</p>
                        </div>
                        <p className="text-gray-500 text-sm">{post.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 text-sm">
                        {post.createdAt && format(post.createdAt.toDate(), 'MM/dd HH:mm', { locale: ja })}
                      </span>
                      {post.userId === user?.uid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(post.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Photos */}
                  {post.photos && post.photos.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {post.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo || "/placeholder.svg"}
                          alt={`ワークアウト写真 ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Workout Summary */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-gray-900">ワークアウト詳細</h3>
                      <Badge variant="outline" className="text-gray-600">
                        {post.duration}分
                      </Badge>
                    </div>

                    {/* Exercise Details */}
                    <div className="space-y-3">
                      {post.exercises.map((exercise, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">{exercise.name}</span>
                            <span className="text-sm text-gray-500">{exercise.sets.length}セット</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {exercise.sets.map((set, setIndex) => (
                              <div key={setIndex} className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-red-600">{set.weight}kg</div>
                                <div className="text-gray-600">{set.reps}回</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  {post.comment && (
                    <div className="mb-4">
                      <p className="text-gray-700">{post.comment}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent"
                      >
                        <Heart
                          className={`w-5 h-5 ${(post.likedBy || []).includes(user?.uid || '') ? "fill-red-500 text-red-500" : "text-gray-600 hover:text-red-500"}`}
                        />
                        <span className="text-sm font-medium">{post.likes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent"
                      >
                        <MessageCircle className="w-5 h-5 text-gray-600 hover:text-red-500" />
                        <span className="text-sm font-medium">{post.comments}</span>
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                      <Share className="w-5 h-5 text-gray-600 hover:text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>投稿を削除</AlertDialogTitle>
            <AlertDialogDescription>
              この投稿を削除してもよろしいですか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>削除中...</span>
                </div>
              ) : (
                "削除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}