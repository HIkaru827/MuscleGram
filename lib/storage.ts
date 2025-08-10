import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import { v4 as uuidv4 } from 'uuid'

export const uploadImage = async (file: File, folder: string = 'images'): Promise<string> => {
  try {
    // Generate unique filename
    const fileName = `${uuidv4()}.${file.name.split('.').pop()}`
    const storageRef = ref(storage, `${folder}/${fileName}`)
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file)
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export const uploadMultipleImages = async (files: File[], folder: string = 'images'): Promise<string[]> => {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder))
    const urls = await Promise.all(uploadPromises)
    return urls
  } catch (error) {
    console.error('Error uploading multiple images:', error)
    throw error
  }
}

export const deleteImage = async (url: string): Promise<void> => {
  try {
    // Extract path from URL
    const urlParts = url.split('/o/')[1].split('?')[0]
    const path = decodeURIComponent(urlParts)
    
    const imageRef = ref(storage, path)
    await deleteObject(imageRef)
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('サポートされていないファイル形式です。JPEG、PNG、WebPファイルのみアップロード可能です。')
  }
  
  if (file.size > maxSize) {
    throw new Error('ファイルサイズが大きすぎます。5MB以下のファイルをアップロードしてください。')
  }
  
  return true
}

export const compressImage = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      const width = img.width * ratio
      const height = img.height * ratio
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file)
        }
      }, file.type, quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}