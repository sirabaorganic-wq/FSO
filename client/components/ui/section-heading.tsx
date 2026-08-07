import { ArrowRight } from 'lucide-react'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  copy?: string
  action?: string
  actionHref?: string
  inverted?: boolean
}

export function SectionHeading({ eyebrow, title, copy, action, actionHref = '#shop', inverted = false }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className={`eyebrow mb-4 ${inverted ? 'text-accent' : ''}`}>{eyebrow}</p>
        <h2 className={`display max-w-3xl text-5xl md:text-7xl ${inverted ? 'text-primary-foreground' : 'text-primary'}`}>{title}</h2>
        {copy ? <p className={`mt-5 max-w-xl text-sm leading-7 ${inverted ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{copy}</p> : null}
      </div>
      {action ? (
        <a href={actionHref} className={`group flex min-h-11 shrink-0 items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] ${inverted ? 'text-accent' : 'text-secondary'}`}>
          {action}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )
}
