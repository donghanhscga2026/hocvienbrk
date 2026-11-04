import { createElement, type ReactNode } from 'react'
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5'

const allowed = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'a',
  'div',
  'span',
  'table',
  'tbody',
  'tr',
  'td',
  'th',
])
const blocked = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'])
export default function OfferingRichText({
  text,
  onOpenLink,
}: {
  text?: string | null
  onOpenLink?: (url: string, title: string) => void
}) {
  if (!text) return null
  const fragment = parseFragment(text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'))
  function render(node: DefaultTreeAdapterMap['childNode'], index: number): ReactNode {
    if (node.nodeName === '#text') return 'value' in node ? node.value : null
    if (!('tagName' in node) || blocked.has(node.tagName)) return null
    const children = node.childNodes.map(render)
    if (!allowed.has(node.tagName)) return children
    const href = node.attrs.find((attr) => attr.name === 'href')?.value
    const safeHref =
      href &&
      (/^https:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//') && !/[\\\s]/.test(href)))
        ? href
        : undefined
    if (node.tagName === 'a' && safeHref && onOpenLink)
      return createElement(
        'button',
        {
          key: index,
          type: 'button',
          className: 'min-h-11 text-left font-semibold text-brk-primary underline',
          onClick: () => onOpenLink(safeHref, 'Nội dung liên quan'),
        },
        ...children,
      )
    return createElement(
      node.tagName,
      {
        key: index,
        ...(node.tagName === 'a' && safeHref
          ? {
              href: safeHref,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'font-semibold text-brk-primary underline',
            }
          : {}),
      },
      ...children,
    )
  }
  return (
    <div className="whitespace-pre-wrap break-words text-base leading-8 text-brk-muted [&_h2]:my-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
      {fragment.childNodes.map(render)}
    </div>
  )
}
