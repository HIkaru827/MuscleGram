// Base64画像処理ユーティリティ（Firebase Storage不要）

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert to base64'))
      }
    }
    reader.onerror = reject
  })
}

export const compressImageToBase64 = async (
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = width * ratio
        height = height * ratio
      }
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      // Convert to base64 with compression
      const base64 = canvas.toDataURL('image/jpeg', quality)
      
      // Check size (Firestore has 1MB limit per document)
      const sizeInBytes = (base64.length * 3) / 4
      const sizeInMB = sizeInBytes / (1024 * 1024)
      
      if (sizeInMB > 0.8) { // 0.8MB limit to be safe
        reject(new Error('圧縮後の画像サイズが大きすぎます。より小さな画像を選択してください。'))
      } else {
        resolve(base64)
      }
    }
    
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = URL.createObjectURL(file)
  })
}

export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 2 * 1024 * 1024 // 2MB (before compression)
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('サポートされていないファイル形式です。JPEG、PNG、WebPファイルのみアップロード可能です。')
  }
  
  if (file.size > maxSize) {
    throw new Error('ファイルサイズが大きすぎます。2MB以下のファイルを選択してください。')
  }
  
  return true
}

export const processImageForFirestore = async (file: File): Promise<string> => {
  validateImageFile(file)
  return await compressImageToBase64(file)
}