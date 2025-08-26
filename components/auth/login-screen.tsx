"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, UserPlus, LogIn, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginScreenProps {
  onClose?: () => void
}

export default function LoginScreen({ onClose }: LoginScreenProps) {
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    confirmPassword: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError("パスワードが一致しません")
          return
        }
        if (formData.password.length < 6) {
          setError("パスワードは6文字以上で入力してください")
          return
        }
        await signUp(formData.email, formData.password, formData.displayName)
      } else {
        await signIn(formData.email, formData.password)
      }
      onClose?.()
    } catch (error: any) {
      let errorMessage = "エラーが発生しました"
      
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorMessage = "メールアドレスまたはパスワードが正しくありません"
          break
        case "auth/email-already-in-use":
          errorMessage = "このメールアドレスは既に使用されています"
          break
        case "auth/weak-password":
          errorMessage = "パスワードが弱すぎます"
          break
        case "auth/invalid-email":
          errorMessage = "メールアドレスの形式が正しくありません"
          break
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    
    try {
      await signInWithGoogle()
      onClose?.()
    } catch (error: any) {
      setError(error.message || "Googleでのログインに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSignIn = async () => {
    setLoading(true)
    setError("")
    
    try {
      await signInAsGuest()
      onClose?.()
    } catch (error: any) {
      setError(error.message || "ゲストログインに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-24 h-24 flex items-center justify-center">
            <img 
              src="/app_logo.png" 
              alt="MuscleGram Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isSignUp ? "アカウント作成" : "MuscleGramへログイン"}
          </CardTitle>
          <p className="text-gray-600">
            {isSignUp 
              ? "筋トレSNSでフィットネスライフを共有しよう" 
              : "筋トレSNSでフィットネスライフを記録・共有"
            }
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">表示名</Label>
                <div className="relative">
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="田中太郎"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                  <UserPlus className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="6文字以上"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを再入力"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {isSignUp ? "アカウントを作成" : "ログイン"}
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Googleでログイン
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
            onClick={handleGuestSignIn}
            disabled={loading}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            ゲストとして体験する
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm text-gray-600"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "すでにアカウントをお持ちの方はこちら"
                : "新規アカウントを作成する"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}