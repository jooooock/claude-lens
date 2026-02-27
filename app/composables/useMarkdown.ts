import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'

// 注册常用语言
hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('diff', diff)

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true
})

// 自定义 renderer 为代码块添加高亮
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string, lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : ''
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value
  return `<pre class="code-block hljs"><code class="language-${language || 'auto'}">${highlighted}</code></pre>`
}

renderer.codespan = ({ text }: { text: string }) => {
  return `<code class="inline-code">${text}</code>`
}

marked.use({ renderer })

/**
 * 渲染 Markdown 文本为 HTML
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''
  const html = marked.parse(text) as string
  return DOMPurify.sanitize(html)
}

/**
 * 高亮 JSON 文本
 */
export function highlightJson(text: string): string {
  if (!text) return ''
  try {
    return hljs.highlight(text, { language: 'json' }).value
  } catch {
    return text
  }
}

/**
 * 判断文本是否可能是 JSON
 */
export function isJsonLike(text: string): boolean {
  const trimmed = text.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

/**
 * 判断文本是否包含 Markdown 语法
 */
export function hasMarkdown(text: string): boolean {
  return /(?:^#{1,6}\s|^\s*[-*+]\s|\*\*|__|```|`[^`]+`|\[.+?\]\(.+?\)|^\s*>\s|^\s*\d+\.\s)/m.test(text)
}
