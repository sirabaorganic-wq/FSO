import Image, { type ImageProps } from 'next/image'

interface ImageCardProps extends Omit<ImageProps, 'fill' | 'className'> {
  className?: string
  imageClassName?: string
  sizes?: string
  fill?: boolean
}

export function ImageCard({ className = '', imageClassName = '', sizes = '(max-width: 768px) 90vw, 40vw', fill = true, alt = '', ...props }: ImageCardProps) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      <Image {...props} alt={alt} fill={fill} sizes={sizes} className={`object-cover ${imageClassName}`} />
    </div>
  )
}
