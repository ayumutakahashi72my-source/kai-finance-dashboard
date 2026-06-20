import React from 'react'

export function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700, color: 'var(--kai-text1)' }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="mono" style={{ fontSize: 13, color: '#fb9477', background: 'rgba(251,148,119,0.10)', borderRadius: 4, padding: '1px 5px' }}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

export function renderMarkdown(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 8 }} />)
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} style={{ fontSize: 20, fontWeight: 700, color: 'var(--kai-text1)', marginBottom: 12, marginTop: 20, letterSpacing: '-.01em' }}>
          {inlineMarkdown(line.slice(2))}
        </h1>
      )
      continue
    }

    if (line.startsWith('## ')) {
      const raw = line.slice(3)
      elements.push(
        <h2 key={key++} style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10, marginTop: 22, paddingBottom: 6, borderBottom: '1px solid rgba(167,139,250,0.18)', fontFamily: 'var(--font-mono),monospace' }}>
          {raw}
        </h2>
      )
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} style={{ fontSize: 14, fontWeight: 700, color: '#fb9477', marginBottom: 6, marginTop: 14 }}>
          {inlineMarkdown(line.slice(4))}
        </h3>
      )
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 10, marginBottom: 6, paddingLeft: 4 }}>
          <span style={{ color: '#fb9477', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>·</span>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--kai-text2)' }}>{inlineMarkdown(line.slice(2))}</p>
        </div>
      )
      continue
    }

    elements.push(
      <p key={key++} style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--kai-text2)', marginBottom: 4 }}>
        {inlineMarkdown(line)}
      </p>
    )
  }

  return elements
}
