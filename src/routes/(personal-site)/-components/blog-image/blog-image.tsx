import { type ComponentPropsWithoutRef } from 'react'
import styles from './blog-image.module.css'

type BlogImageProps = ComponentPropsWithoutRef<'img'>

/**
 * The `img` override registered on the MDX provider, so every image in a post —
 * whether written as Markdown `![alt](./pic.png)` or a JSX `<img>` — renders
 * through here. Co-located post images are resolved to hashed URLs by Vite's
 * asset pipeline before reaching this component; it only handles presentation:
 * a responsive, block-level image that never overflows the prose column, loaded
 * lazily.
 *
 * Alt text is guaranteed non-empty by the build-time remark check
 * (blog/mdx-plugins.ts), so it is passed straight through.
 */
export function BlogImage({ alt, ...props }: BlogImageProps) {
  // `alt` is pulled out and passed explicitly (rather than via the spread) so
  // its presence is statically visible; the build-time check guarantees it is
  // non-empty.
  return (
    <img
      alt={alt}
      {...props}
      className={styles.image}
      loading="lazy"
      decoding="async"
    />
  )
}
