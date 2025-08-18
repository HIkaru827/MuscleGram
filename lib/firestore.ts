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
import { PRRecord } from './pr-utils'

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'workout_posts',
  COMMENTS: 'comments',
  FOLLOWS: 'follows',
  LIKES: 'likes',
  PRS: 'personal_records',
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

export const deletePost = async (postId: string, userId: string) => {
  try {
    const postRef = doc(db, COLLECTIONS.POSTS, postId)
    const postSnap = await getDoc(postRef)
    
    if (!postSnap.exists()) {
      throw new Error('Post not found')
    }

    const postData = postSnap.data() as WorkoutPost
    
    // Verify the post belongs to the user
    if (postData.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own posts')
    }

    // Delete associated PRs first
    const prsQuery = query(
      collection(db, COLLECTIONS.PRS),
      where('workoutId', '==', postId),
      where('userId', '==', userId)
    )
    const prsSnapshot = await getDocs(prsQuery)
    
    const deletePRsPromises = prsSnapshot.docs.map(prDoc => 
      deleteDoc(prDoc.ref)
    )
    await Promise.all(deletePRsPromises)

    // Delete the post
    await deleteDoc(postRef)

    // Update user's posts count
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    await updateDoc(userRef, {
      postsCount: increment(-1),
      updatedAt: serverTimestamp(),
    })

    // Delete associated comments
    const commentsQuery = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('postId', '==', postId)
    )
    const commentsSnapshot = await getDocs(commentsQuery)
    
    const deleteCommentsPromises = commentsSnapshot.docs.map(commentDoc => 
      deleteDoc(commentDoc.ref)
    )
    await Promise.all(deleteCommentsPromises)

  } catch (error) {
    console.error('Error deleting post:', error)
    throw error
  }
}

// Personal Records (PRs)
export const savePR = async (prData: Omit<PRRecord, 'id'>) => {
  try {
    const prsRef = collection(db, COLLECTIONS.PRS)
    
    // Remove undefined fields to prevent Firestore errors
    const cleanedData = Object.fromEntries(
      Object.entries({
        ...prData,
        date: serverTimestamp(),
      }).filter(([_, value]) => value !== undefined)
    )
    
    const docRef = await addDoc(prsRef, cleanedData)
    return docRef
  } catch (error) {
    console.error('Error saving PR:', error)
    throw error
  }
}

export const getUserPRs = async (userId: string, exerciseName?: string, prType?: PRRecord['prType']) => {
  try {
    // Start with simple query to avoid index requirements
    let q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId)
    )

    // Add additional filters if specified
    if (exerciseName) {
      q = query(q, where('exerciseName', '==', exerciseName))
    }

    if (prType) {
      q = query(q, where('prType', '==', prType))
    }

    const querySnapshot = await getDocs(q)
    const prs: PRRecord[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      prs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord)
    })

    // Sort by date in memory instead of using orderBy
    return prs.sort((a, b) => b.date.getTime() - a.date.getTime())
  } catch (error) {
    console.error('Error getting PRs:', error)
    throw error
  }
}

export const getLatestPRForExercise = async (userId: string, exerciseName: string, prType: PRRecord['prType']) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId),
      where('exerciseName', '==', exerciseName),
      where('prType', '==', prType)
    )

    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    const prs: PRRecord[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      prs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord)
    })

    // Sort by date in memory and return the latest
    const sortedPRs = prs.sort((a, b) => b.date.getTime() - a.date.getTime())
    return sortedPRs[0] || null
  } catch (error) {
    console.error('Error getting latest PR:', error)
    return null
  }
}

export const getWeeklyPRs = async (userId: string) => {
  try {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Use simple query to avoid index requirements
    const q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    const allPRs: PRRecord[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      allPRs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord)
    })

    // Filter by date in memory and sort
    const weeklyPRs = allPRs
      .filter(pr => pr.date >= weekAgo)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    return weeklyPRs
  } catch (error) {
    console.error('Error getting weekly PRs:', error)
    throw error
  }
}

/**
 * Get PR trend data for a specific exercise and PR type
 * Returns the last 6 PR records for trend analysis
 * 
 * @param userId - User ID
 * @param exerciseName - Exercise name
 * @param prType - PR type (e1RM, 3RM, etc.)
 * @param limit - Maximum number of records to return (default: 6)
 * @returns Promise<PRRecord[]> - Array of PR records sorted by date (oldest first)
 */
export const getPRTrendData = async (
  userId: string, 
  exerciseName: string, 
  prType: PRRecord['prType'], 
  limit = 6
): Promise<PRRecord[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId),
      where('exerciseName', '==', exerciseName),
      where('prType', '==', prType)
    )

    const querySnapshot = await getDocs(q)
    const prs: PRRecord[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      prs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord)
    })

    // Sort by date (newest first) and take the last 'limit' records
    return prs
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit)
      .reverse() // Return in chronological order (oldest first)

  } catch (error) {
    console.error('Error getting PR trend data:', error)
    throw error
  }
}

/**
 * Get best PRs grouped by muscle group
 * 
 * @param userId - User ID
 * @returns Promise<Record<string, PRRecord[]>> - PRs grouped by muscle group
 */
export const getBestPRsByMuscleGroup = async (userId: string) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    const allPRs: PRRecord[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      allPRs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord)
    })

    // Group by exercise name and get the best PR for each
    const exerciseBests: Record<string, PRRecord> = {}
    
    allPRs.forEach(pr => {
      const key = `${pr.exerciseName}_${pr.prType}`
      if (!exerciseBests[key] || pr.value > exerciseBests[key].value) {
        exerciseBests[key] = pr
      }
    })

    return Object.values(exerciseBests)

  } catch (error) {
    console.error('Error getting best PRs by muscle group:', error)
    throw error
  }
}

/**
 * Get PR achievement frequency for the last 30 days, grouped by muscle group
 * 
 * @param userId - User ID
 * @returns Promise<Record<string, number>> - PR count by muscle group
 */
export const getPRAchievementFrequency = async (userId: string) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const q = query(
      collection(db, COLLECTIONS.PRS),
      where('userId', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    const recentPRs: PRRecord[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const pr = {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      } as PRRecord
      
      if (pr.date >= thirtyDaysAgo) {
        recentPRs.push(pr)
      }
    })

    // Import getMuscleGroupFromExercise here to avoid circular imports
    const { getMuscleGroupFromExercise } = await import('./pr-utils')
    
    // Count PRs by muscle group
    const frequency: Record<string, number> = {}
    
    recentPRs.forEach(pr => {
      const muscleGroup = getMuscleGroupFromExercise(pr.exerciseName)
      frequency[muscleGroup] = (frequency[muscleGroup] || 0) + 1
    })

    return frequency

  } catch (error) {
    console.error('Error getting PR achievement frequency:', error)
    throw error
  }
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