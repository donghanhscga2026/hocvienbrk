import Image from 'next/image'

const alt = 'WI.CAN kết nối Wi.Grow, Wi.Mentor, Wi.Tech, Wi.Art, Wi.Finance, Wi.Marketing, Wi.Yoga, Wi.Book và Wi.Wellness'
const sizes = '(max-width: 639px) 210vw, (max-width: 1023px) 1200px, 1150px'

/** Local responsive files avoid a first-request image transformation on the server. */
export default function Wi300HeroImage({ imageUrl }: { imageUrl: string }) {
  if (imageUrl) return <Image src={imageUrl} alt={alt} width={1280} height={720} priority sizes={sizes} unoptimized className="h-auto w-full object-contain" />
  return <picture>
    <source type="image/webp" srcSet="/wi300/ecosystem-640.webp 640w, /wi300/ecosystem-960.webp 960w, /wi300/ecosystem-1280.webp 1280w" sizes={sizes} />
    <Image src="/wi300/ecosystem-1280.webp" alt={alt} width={1280} height={720} loading="eager" fetchPriority="high" unoptimized className="wi300-ecosystem-source" />
  </picture>
}
