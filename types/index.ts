import { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  bio?: string
  followers: number
  following: number
  postsCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface WorkoutSet {
  weight: number
  reps: number
  restTime?: number
}

export interface Exercise {
  id: string
  name: string
  sets: WorkoutSet[]
  category?: string
  targetMuscles?: string[]
}

export interface WorkoutPost {
  id: string
  userId: string
  user?: User
  exercises: Exercise[]
  comment: string
  photos?: string[]
  duration: number
  likes: number
  likedBy: string[]
  comments: number
  isPublic: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Comment {
  id: string
  postId: string
  userId: string
  user?: User
  content: string
  likes: number
  likedBy: string[]
  createdAt: Timestamp
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Timestamp
}