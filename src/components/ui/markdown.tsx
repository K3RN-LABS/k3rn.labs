"use client"

import { cn } from "@/lib/utils"

interface MarkdownProps {
  children: string
  className?: string
  invert?: boolean
}

/**
 * Lightweight markdown renderer — no external deps.
 * Supports: headings, bold, italic, inline code, lists, blockquotes, horizontal rules, paragraphs.
 */
export function Markdown({ children, className, invert = false }: MarkdownProps) {
  const lines = (children ?? "").split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  function parseInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
    let last = 0
    let match
    let key = 0
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index))
      if (match[2]) parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>)
      else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>)
      else if (match[4]) parts.push(<code key={key++} className={cn("font-jakarta bg-secondary/30 rounded px-1.5 py-0.5 text-xs", invert ? "bg-white/15" : "bg-black/10")}>{match[4]}</code>)
      last = match.index + match[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold mt-2 mb-0.5">{parseInline(line.slice(4))}</h3>)
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-sm font-bold mt-2 mb-1">{parseInline(line.slice(3))}</h2>)
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-base font-bold mt-2 mb-1">{parseInline(line.slice(2))}</h1>)

      // Blockquote
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className={cn("border-l-2 pl-3 my-1 opacity-80", invert ? "border-white/40" : "border-current/30")}>
          <p className="text-sm">{parseInline(line.slice(2))}</p>
        </blockquote>
      )

      // Unordered list
    } else if (/^[-*+] /.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        listItems.push(<li key={i}>{parseInline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc pl-4 my-1 space-y-0.5 text-sm">{listItems}</ul>)
      continue

      // Ordered list
    } else if (/^\d+\. /.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(<li key={i}>{parseInline(lines[i].replace(/^\d+\. /, ""))}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal pl-4 my-1 space-y-0.5 text-sm">{listItems}</ol>)
      continue

      // Horizontal rule
    } else if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-2 border-current/20" />)

      // Empty line → spacing
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />)

      // Paragraph
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{parseInline(line)}</p>)
    }

    i++
  }

  return <div className={cn("space-y-0.5", className)}>{elements}</div>
}
