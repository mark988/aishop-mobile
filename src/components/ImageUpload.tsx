import React, { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

// API Base URL from environment variable
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void
  currentImage?: string
  maxSizeMB?: number
  acceptedFormats?: string[]
  label?: string
  description?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImage,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  label = '上传支付截图',
  description = '支持 JPG、PNG 格式，最大 5MB'
}) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!acceptedFormats.includes(file.type)) {
      setError(`不支持的文件格式。请上传 ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join('、')} 格式的图片`)
      toast.error('文件格式不支持')
      return
    }

    // 验证文件大小
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`文件过大。最大支持 ${maxSizeMB}MB`)
      toast.error(`文件过大，最大支持 ${maxSizeMB}MB`)
      return
    }

    setError(null)
    setUploading(true)

    // 创建本地预览用于加载时显示
    let localPreviewUrl: string | null = null

    try {
      // 先创建临时预览，提升用户体验
      const reader = new FileReader()
      const previewPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const url = e.target?.result as string
          resolve(url)
        }
      })
      reader.readAsDataURL(file)
      localPreviewUrl = await previewPromise
      setPreview(localPreviewUrl)

      // 上传到服务器
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading to:', `${API_BASE_URL}/files/upload`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `上传失败: HTTP ${response.status}`

        // 针对不同的HTTP状态码给出友好提示
        if (response.status === 502 || response.status === 503) {
          errorMessage = '服务器暂时不可用，请稍后重试'
        } else if (response.status === 413) {
          errorMessage = '文件太大，请选择更小的文件'
        } else if (response.status === 404) {
          errorMessage = '上传接口不存在'
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误'
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Upload response:', result)

      if (result.code === 200 && result.data) {
        const imageUrl = result.data.url || result.data
        onImageUploaded(imageUrl)
        toast.success('图片上传成功！')
        // 保持预览显示
      } else {
        throw new Error(result.message || '上传失败，请重试')
      }
    } catch (err) {
      console.error('Upload error:', err)

      let errorMessage = '上传失败，请重试'

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = '上传超时，请检查网络连接'
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = '网络连接失败，请检查网络或稍后重试'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
      setPreview(null) // 清除预览
      onImageUploaded('') // 清除已上传的URL
    } finally {
      setUploading(false)
      // 清空文件选择，允许再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onImageUploaded('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          {label} <span className="text-red-500">*</span>
        </label>
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>移除</span>
          </button>
        )}
      </div>

      <div
        onClick={!uploading && !preview ? handleClick : undefined}
        className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
          !preview
            ? 'border-gray-300 bg-gray-50 cursor-pointer active:bg-blue-50'
            : 'border-green-300 bg-green-50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {!preview ? (
          <div className="p-6 text-center">
            <div className="flex justify-center mb-2">
              {uploading ? (
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              ) : (
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary-600" />
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {uploading ? 'Uploading...' : 'Click to upload payment screenshot'}
            </p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        ) : (
          <div className="p-3">
            <div className="relative group">
              <img
                src={preview}
                alt="支付截图预览"
                className="w-full h-48 object-contain rounded-lg bg-white"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 active:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleClick}
                  className="bg-white text-gray-800 px-3 py-2 rounded-lg text-xs font-medium shadow-lg"
                >
                  重新上传
                </button>
              </div>
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 shadow-lg">
                <CheckCircle className="w-3 h-3" />
                <span>已上传</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-gray-500 flex items-start space-x-1">
        <ImageIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>Please upload a clear screenshot of the payment, ensuring it includes key information such as the transfer time and amount.</span>
      </p>
    </div>
  )
}
