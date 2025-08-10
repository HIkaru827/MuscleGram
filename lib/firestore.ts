import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { WorkoutPost, Comment, User, Follow } from '@/types'

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'workout_posts',
  COMMENTS: 'comments',
  FOLLOWS: 'follows',
  LIKES: 'likes',
} as const

// Users
export const createUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userData.uid)
    await updateDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return userRef
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export const getUser = async (uid: string): Promise<User | null> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as User
    }
    return null
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}

// Posts
export const createPost = async (postData: Omit<WorkoutPost, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const postsRef = collection(db, COLLECTIONS.POSTS)
    const docRef = await addDoc(postsRef, {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update user's posts count
    const userRef = doc(db, COLLECTIONS.USERS, postData.userId)
    await updateDoc(userRef, {
      postsCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    return docRef
  } catch (error) {
    console.error('Error creating post:', error)
    throw error
  }
}

export const getPosts = async (userId?: string, limitCount = 20) => {
  try {
    let q
    
    if (userId) {
      q = query(
        collection(db, COLLECTIONS.POSTS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    } else {
      q = query(
        collection(db, COLLECTIONS.POSTS),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    }

    const querySnapshot = await getDocs(q)
    const posts: WorkoutPost[] = []

    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() } as WorkoutPost)
    })

    return posts
  } catch (error) {
    console.error('Error getting posts:', error)
    throw error
  }
}

export const getPost = async (postId: string): Promise<WorkoutPost | null> => {
  try {
    const postRef = doc(db, COLLECTIONS.POSTS, postId)
    const postSnap = await getDoc(postRef)
    
    if (postSnap.exists()) {
      return { id: postId, ...postSnap.data() } as WorkoutPost
    }
    return null
  } catch (error) {
    console.error('Error getting post:', error)
    throw error
  }
}

// Likes
export const toggleLike = async (postId: string, userId: string) => {
  try {
    const postRef = doc(db, COLLECTIONS.POSTS, postId)
    const postSnap = await getDoc(postRef)
    
    if (!postSnap.exists()) {
      throw new Error('Post not found')
    }

    const postData = postSnap.data() as WorkoutPost
    const isLiked = postData.likedBy?.includes(userId) || false

    if (isLiked) {
      // Unlike
      await updateDoc(postRef, {
        likes: increment(-1),
        likedBy: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      })
    } else {
      // Like
      await updateDoc(postRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      })
    }

    return !isLiked
  } catch (error) {
    console.error('Error toggling like:', error)
    throw error
  }
}

// Comments
export const createComment = async (commentData: Omit<Comment, 'id' | 'createdAt'>) => {
  try {
    const commentsRef = collection(db, COLLECTIONS.COMMENTS)
    const docRef = await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp(),
    })

    // Update post's comments count
    const postRef = doc(db, COLLECTIONS.POSTS, commentData.postId)
    await updateDoc(postRef, {
      comments: increment(1),
      updatedAt: serverTimestamp(),
    })

    return docRef
  } catch (error) {
    console.error('Error creating comment:', error)
    throw error
  }
}

export const getComments = async (postId: string) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const comments: Comment[] = []

    querySnapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() } as Comment)
    })

    return comments
  } catch (error) {
    console.error('Error getting comments:', error)
    throw error
  }
}

// Follows
export const followUser = async (followerId: string, followingId: string) => {
  try {
    const followsRef = collection(db, COLLECTIONS.FOLLOWS)
    await addDoc(followsRef, {
      followerId,
      followingId,
      createdAt: serverTimestamp(),
    })

    // Update follower and following counts
    const followerRef = doc(db, COLLECTIONS.USERS, followerId)
    const followingRef = doc(db, COLLECTIONS.USERS, followingId)

    await Promise.all([
      updateDoc(followerRef, {
        following: increment(1),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(followingRef, {
        followers: increment(1),
        updatedAt: serverTimestamp(),
      }),
    ])
  } catch (error) {
    console.error('Error following user:', error)
    throw error
  }
}

export const unfollowUser = async (followerId: string, followingId: string) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    )

    const querySnapshot = await getDocs(q)
    
    querySnapshot.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref)
    })

    // Update follower and following counts
    const followerRef = doc(db, COLLECTIONS.USERS, followerId)
    const followingRef = doc(db, COLLECTIONS.USERS, followingId)

    await Promise.all([
      updateDoc(followerRef, {
        following: increment(-1),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(followingRef, {
        followers: increment(-1),
        updatedAt: serverTimestamp(),
      }),
    ])
  } catch (error) {
    console.error('Error unfollowing user:', error)
    throw error
  }
}

export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    )

    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Error checking follow status:', error)
    return false
  }
}

// Real-time subscriptions
export const subscribeToUserPosts = (
  userId: string,
  callback: (posts: WorkoutPost[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.POSTS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  return onSnapshot(q, (querySnapshot) => {
    const posts: WorkoutPost[] = []
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() } as WorkoutPost)
    })
    callback(posts)
  })
}

export const subscribeToTimelinePosts = (callback: (posts: WorkoutPost[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.POSTS),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  return onSnapshot(q, (querySnapshot) => {
    const posts: WorkoutPost[] = []
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() } as WorkoutPost)
    })
    callback(posts)
  })
}