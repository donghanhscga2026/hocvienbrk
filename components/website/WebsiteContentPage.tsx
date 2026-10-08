/* eslint-disable @next/next/no-html-link-for-pages -- Website navigation reloads fresh permissions. */
import type {WebsitePage,WebsiteLink} from '@/lib/website/pages'
export default function WebsiteContentPage({page,navigation=[]}:{page:WebsitePage;navigation?:WebsiteLink[]}){
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
    {!!navigation.length && <nav aria-label="Menu website" className="mb-10 flex flex-wrap gap-4">{navigation.map(link=><a key={link.href} className="text-brk-accent underline" href={link.href}>{link.title}</a>)}</nav>}
    <article className="rounded-3xl border border-brk-outline bg-brk-surface p-6 sm:p-10"><h1 className="text-3xl font-bold sm:text-4xl">{page.title}</h1>{page.description && <p className="mt-5 text-lg text-brk-muted">{page.description}</p>}<div className="mt-8 whitespace-pre-wrap break-words leading-8">{page.body}</div></article>
  </main>
}
