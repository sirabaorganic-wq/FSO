'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, Send, Bot, User, ArrowRight } from 'lucide-react'
import { agricultureImages } from '@/data/images'

interface SuggestionCard {
  title: string
  subtitle: string
  description: string
  image: string
  category: string
  href: string
}

export function AIDiscovery() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; cards?: SuggestionCard[] }[]>([
    {
      role: 'ai',
      text: 'Namaste! I am your Heritage Kitchen Assistant. Ask me anything about regional Indian ingredients, dietary goals, or traditional recipes!',
    },
  ])
  const [inputQuery, setInputQuery] = useState('')

  const quickPrompts = [
    'Suggest ingredients for monsoon immunity',
    'I cook Gujarati & Marwari food',
    'High-protein native breakfast staples',
    'Which cold pressed oil is best for daily sauteing?',
  ]

  const handleSend = (queryText: string) => {
    if (!queryText.trim()) return

    const userMsg = { role: 'user' as const, text: queryText }
    let aiResponseCards: SuggestionCard[] = []
    let aiResponseText = ''

    if (queryText.toLowerCase().includes('monsoon')) {
      aiResponseText = 'Here are our top recommended warming Pahadi spices & A2 Vedic ghee for monsoon digestive health:'
      aiResponseCards = [
        {
          title: 'Kumaon Wild Jakhiya Seeds',
          subtitle: 'High Altitude Tempering Seed',
          description: 'Crackles beautifully in hot mustard oil, providing digestive warmth during rains.',
          image: agricultureImages.spice,
          category: 'Himalayan Spices',
          href: '/shop',
        },
        {
          title: 'Bundelkhand Bilona A2 Desi Ghee',
          subtitle: 'Sahiwal Cow Clay Pot Ghee',
          description: 'Rich in gut-friendly butyric acid to strengthen immunity.',
          image: agricultureImages.grain,
          category: 'Vedic Ghee',
          href: '/shop',
        },
      ]
    } else if (queryText.toLowerCase().includes('oil')) {
      aiResponseText = 'For daily high-temperature sauteing, unrefined Vaagai wood-pressed sesame or groundnut oil is ideal:'
      aiResponseCards = [
        {
          title: 'Chettinad Vaagai Wood Sesame Oil',
          subtitle: 'Unrefined Vaagai Mortar Extraction',
          description: 'Rich in natural sesamol antioxidants with zero solvent residue.',
          image: agricultureImages.oil,
          category: 'Cold Pressed Oils',
          href: '/shop',
        },
      ]
    } else {
      aiResponseText = 'Based on your culinary preference, here are handpicked heritage recommendations:'
      aiResponseCards = [
        {
          title: 'Majuli Island Fragrant Joha Rice',
          subtitle: 'Assam Alluvial Flood Plain Rice',
          description: 'Indigenous aromatic pearl rice variety with natural popcorn aroma.',
          image: agricultureImages.harvest,
          category: 'Heirloom Grains',
          href: '/shop',
        },
        {
          title: 'Western Ghats Wild Multifloral Honey',
          subtitle: 'Raw Tribal Harvest Honey',
          description: 'Unfiltered single-origin raw bee honey from Karnataka biosphere.',
          image: agricultureImages.pantry,
          category: 'Wild Honey',
          href: '/shop',
        },
      ]
    }

    setMessages((prev) => [...prev, userMsg, { role: 'ai', text: aiResponseText, cards: aiResponseCards }])
    setInputQuery('')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="eyebrow text-accent">Smart Culinary Assistant</span>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
          AI Heritage Ingredient Discovery
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Ask for personalized ingredient recommendations based on your regional cooking style, health goals, or current season.
        </p>
      </div>

      {/* Chat Conversation Box */}
      <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-surface shadow-xl overflow-hidden flex flex-col h-[520px]">
        {/* Messages History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 text-xs ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'ai' && (
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/20 text-accent-foreground border border-accent/30 mt-0.5">
                  <Sparkles className="size-4" />
                </div>
              )}
              <div className={`space-y-3 max-w-md ${m.role === 'user' ? 'bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-xs' : 'bg-surface-muted/40 p-4 rounded-2xl rounded-tl-xs border border-border/60'}`}>
                <p className="leading-relaxed font-medium">{m.text}</p>
                {m.cards && m.cards.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {m.cards.map((card, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-foreground shadow-2xs">
                        <div className="relative size-12 rounded-lg overflow-hidden border border-border shrink-0">
                          <Image src={card.image} alt={card.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-secondary uppercase">{card.category}</span>
                          <p className="font-bold text-xs truncate">{card.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{card.description}</p>
                        </div>
                        <Link href={card.href} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground border border-border mt-0.5">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-border/60 bg-surface-muted/20 flex gap-2 overflow-x-auto">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground whitespace-nowrap hover:bg-surface-muted transition-colors"
            >
              ✨ {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(inputQuery)
          }}
          className="p-3 border-t border-border bg-surface flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask a question (e.g., What ghee is best for khichdi?)..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 rounded-xl border border-border/80 bg-background px-4 py-2.5 text-xs outline-none focus:border-ring text-foreground"
          />
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground hover:bg-accent/90 transition-all"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
