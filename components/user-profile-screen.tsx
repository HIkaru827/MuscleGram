"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2, UserPlus, UserMinus, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/AuthContext"
import { WorkoutPost as WorkoutPostType } from "@/types"
import { getPosts, toggleLike, getUser, deletePost, followUser, unfollowUser, isFollowing } from "@/lib/firestore"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { toast } from "sonner"
import WorkoutCalendar from "./workout-calendar"
import WorkoutStats from "./workout-stats"

interface UserProfileScreenProps {
  userId: string
  onBack: () => void
}

export default function UserProfileScreen({ userId, onBack }: UserProfileScreenProps) {
  const { user, refreshUserProfile } = useAuth()
  const [targetUser, setTargetUser] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<WorkoutPostType[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    if (!user || !userId) return
    
    try {
      // Load target user profile
      const userData = await getUser(userId)
      setTargetUser(userData)

      // Load user's posts
      const posts = await getPosts(userId)
      const postsWithUserData = posts.map(post => ({ ...post, user: userData }))
      setUserPosts(postsWithUserData)

      // Check if current user is following this user
      if (userId !== user.uid) {
        const following = await isFollowing(user.uid, userId)
        setIsFollowingUser(following)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading user profile:', error)
      toast.error("プロフィールの読み込みに失敗しました")
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) return
    
    try {
      const newIsLiked = await toggleLike(postId, user.uid)
      setUserPosts(prevPosts =>
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

  const handleFollow = async () => {
    if (!user || !targetUser) return
    
    try {
      if (isFollowingUser) {
        await unfollowUser(user.uid, userId)
        setIsFollowingUser(false)
        toast.success("フォローを解除しました")
      } else {
        await followUser(user.uid, userId)
        setIsFollowingUser(true)
        toast.success("フォローしました")
      }
      
      // Refresh user profile and reload target user data
      await refreshUserProfile()
      await loadUserProfile()
    } catch (error) {
      console.error('Error toggling follow:', error)
      toast.error("フォロー処理に失敗しました")
    }
  }

  const handleDeletePost = async () => {
    if (!user || !postToDelete) return

    setDeleting(true)
    try {
      await deletePost(postToDelete, user.uid)
      setUserPosts(prevPosts => prevPosts.filter(post => post.id !== postToDelete))
      
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">ユーザーが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center p-4 border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="mr-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-lg font-semibold">{targetUser.displayName}のプロフィール</h1>
      </div>

      {/* User Profile Section */}
      <Card className="m-4">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={targetUser.photoURL || "/placeholder.svg"} alt={targetUser.displayName} />
              <AvatarFallback className="bg-red-100 text-red-600 text-xl">
                {targetUser.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{targetUser.displayName || 'ユーザー'}</h1>
                  <p className="text-gray-600">{targetUser.email}</p>
                  
                  {/* フォロー統計 */}
                  <div className="flex items-center space-x-6 mt-2">
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-gray-900">{targetUser.following || 0}</span>
                      <span className="text-sm text-gray-600">フォロー</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-gray-900">{targetUser.followers || 0}</span>
                      <span className="text-sm text-gray-600">フォロワー</span>
                    </div>
                  </div>
                </div>
                
                {/* Follow button (only show if not viewing own profile) */}
                {userId !== user?.uid && (
                  <Button
                    variant={isFollowingUser ? "secondary" : "default"}
                    onClick={handleFollow}
                    className="flex items-center space-x-2"
                  >
                    {isFollowingUser ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        <span>フォロー中</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>フォロー</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {targetUser.bio && (
                <p className="text-gray-700 mt-3 leading-relaxed">{targetUser.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <div className="p-4">
        <WorkoutStats userId={userId} />
      </div>

      {/* Calendar Section */}
      <div className="p-4">
        <WorkoutCalendar userId={userId} />
      </div>

      {/* Posts Section */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">{targetUser.displayName}の投稿 ({userPosts.length})</h2>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            まだ投稿がありません
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {userPosts.map((post) => (
                <Card key={post.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={targetUser.photoURL || "/placeholder.svg"} alt={targetUser.displayName || 'User'} />
                          <AvatarFallback className="bg-red-100 text-red-600 text-sm">{targetUser.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{targetUser.displayName || 'Unknown User'}</p>
                          <p className="text-gray-500 text-xs">
                            {post.createdAt && format(post.createdAt.toDate(), 'MM/dd', { locale: ja })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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
                                className="text-red-600"
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
                  
                  <CardContent className="px-4 pb-4">
                    {post.caption && (
                      <p className="text-gray-800 mb-3 leading-relaxed">{post.caption}</p>
                    )}
                    
                    <div className="space-y-3">
                      {post.exercises?.map((exercise, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                            {exercise.category && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.category}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2 font-medium">
                            <div>重量 (kg)</div>
                            <div>回数</div>
                            <div>休憩 (秒)</div>
                          </div>
                          
                          <div className="space-y-1">
                            {exercise.sets?.map((set, setIndex) => (
                              <div key={setIndex} className="grid grid-cols-3 gap-2 text-sm">
                                <div>{set.weight}</div>
                                <div>{set.reps}</div>
                                <div>{set.restTime || '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-4 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center space-x-1 p-0 h-auto hover:bg-transparent"
                      >
                        <Heart
                          className={`w-4 h-4 ${(post.likedBy || []).includes(user?.uid || '') ? "fill-red-500 text-red-500" : "text-gray-600 hover:text-red-500"}`}
                        />
                        <span className="text-xs font-medium">{post.likes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-1 p-0 h-auto hover:bg-transparent"
                      >
                        <MessageCircle className="w-4 h-4 text-gray-600 hover:text-blue-500" />
                        <span className="text-xs font-medium">0</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。投稿は完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}