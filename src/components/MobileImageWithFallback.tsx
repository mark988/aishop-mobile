import { useState, useEffect } from 'react'
import { Package } from 'lucide-react'

interface MobileImageWithFallbackProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
}

export default function MobileImageWithFallback({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-image.svg'
}: MobileImageWithFallbackProps) {
  const [imageSrc, setImageSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 当src变化时重置状态
  useEffect(() => {
    setImageSrc(src)
    setHasError(false)
    setIsLoading(true)
  }, [src])

  const handleError = () => {
    console.log('Image load failed:', imageSrc)
    if (imageSrc !== fallbackSrc) {
      console.log('Trying fallback:', fallbackSrc)
      setImageSrc(fallbackSrc)
    } else {
      console.log('Fallback also failed, showing placeholder')
      setHasError(true)
    }
    setIsLoading(false)
  }

  const handleLoad = () => {
    console.log('Image loaded successfully:', imageSrc)
    setIsLoading(false)
    setHasError(false)
  }

  if (hasError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <Package className="w-12 h-12 text-gray-400" />
      </div>
    )
  }

  // 处理图片URL - 确保完整的URL
  const processedSrc = imageSrc && imageSrc.trim() !== '' ? imageSrc : fallbackSrc

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
          <Package className="w-8 h-8 text-gray-300" />
        </div>
      )}
      <img
        src={processedSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        loading="eager"
        decoding="async"
      />
    </div>
  )
}