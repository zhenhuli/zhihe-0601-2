import type { BaseEditor, Descendant } from 'slate'
import { createEditor, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { withReact, type ReactEditor } from 'slate-react'

export type CustomEditor = BaseEditor & ReactEditor

export type HeadingOneElement = { type: 'heading-one'; children: Descendant[] }
export type HeadingTwoElement = { type: 'heading-two'; children: Descendant[] }
export type HeadingThreeElement = { type: 'heading-three'; children: Descendant[] }
export type HeadingFourElement = { type: 'heading-four'; children: Descendant[] }
export type HeadingFiveElement = { type: 'heading-five'; children: Descendant[] }
export type HeadingSixElement = { type: 'heading-six'; children: Descendant[] }

export type ParagraphElement = { type: 'paragraph'; children: Descendant[] }

export type BlockQuoteElement = { type: 'block-quote'; children: Descendant[] }

export type BulletedListElement = { type: 'bulleted-list'; children: ListItemElement[] }
export type NumberedListElement = { type: 'numbered-list'; children: ListItemElement[] }
export type ListItemElement = { type: 'list-item'; children: Descendant[] }

export type CodeBlockElement = { 
  type: 'code-block'
  language: string
  children: Descendant[] 
}

export type TableElement = { type: 'table'; children: TableRowElement[] }
export type TableRowElement = { type: 'table-row'; children: TableCellElement[] }
export type TableCellElement = { type: 'table-cell'; children: Descendant[] }

export type ImageElement = { 
  type: 'image'
  url: string
  alt?: string
  children: Descendant[] 
}

export type VideoElement = {
  type: 'video'
  url: string
  children: Descendant[]
}

export type DividerElement = { type: 'divider'; children: Descendant[] }

export type FormulaElement = {
  type: 'formula'
  expression: string
  children: Descendant[]
}

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | HeadingThreeElement
  | HeadingFourElement
  | HeadingFiveElement
  | HeadingSixElement
  | BlockQuoteElement
  | BulletedListElement
  | NumberedListElement
  | ListItemElement
  | CodeBlockElement
  | TableElement
  | TableRowElement
  | TableCellElement
  | ImageElement
  | VideoElement
  | DividerElement
  | FormulaElement

export type FormattedText = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  color?: string
  backgroundColor?: string
  commentId?: string
}

export type CustomText = FormattedText

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement
    Text: CustomText
  }
}

export const withCustom = (editor: CustomEditor) => {
  const { isVoid, isInline } = editor

  editor.isVoid = (element) => {
    return element.type === 'image' || 
           element.type === 'video' || 
           element.type === 'divider' ||
           element.type === 'formula'
      ? true
      : isVoid(element)
  }

  editor.isInline = (element) => {
    return element.type === 'image' ? true : isInline(element)
  }

  return editor
}

export const createCustomEditor = () => {
  return withCustom(withHistory(withReact(createEditor())))
}

export const isMarkActive = (editor: CustomEditor, format: keyof FormattedText) => {
  const marks = editor.getMarks()
  return marks ? (marks as any)[format] === true : false
}

export const isBlockActive = (editor: CustomEditor, format: string) => {
  const { selection } = editor
  if (!selection) return false

  const [match] = Array.from(
    editor.nodes({
      at: editor.unhangRange(selection),
      match: n => 'type' in n && n.type === format
    })
  )

  return !!match
}

export const toggleMark = (editor: CustomEditor, format: keyof FormattedText) => {
  const isActive = isMarkActive(editor, format)
  if (isActive) {
    editor.removeMark(format)
  } else {
    editor.addMark(format, true)
  }
}

export const toggleBlock = (editor: CustomEditor, format: string) => {
  const isActive = isBlockActive(editor, format)
  const isList = format === 'bulleted-list' || format === 'numbered-list'

  editor.unwrapNodes({ match: n => 'type' in n && n.type === 'list-item' })
  editor.unwrapNodes({ match: n => 'type' in n && (n.type === 'bulleted-list' || n.type === 'numbered-list') })

  if (isList) {
    const newProperties: Partial<CustomElement> = {
      type: isActive ? 'paragraph' : 'list-item'
    }
    editor.setNodes(newProperties)
    if (!isActive) {
      editor.wrapNodes({ type: format as 'bulleted-list' | 'numbered-list', children: [] })
    }
  } else {
    const newProperties: Partial<CustomElement> = {
      type: isActive ? 'paragraph' : (format as CustomElement['type'])
    }
    editor.setNodes(newProperties)
  }
}

export const insertCodeBlock = (editor: CustomEditor, language: string = 'javascript') => {
  const codeBlock: CodeBlockElement = {
    type: 'code-block',
    language,
    children: [{ text: '' }]
  }
  editor.insertNode(codeBlock)
  Transforms.move(editor, { distance: 1, unit: 'line' })
}

export const insertTable = (editor: CustomEditor, rows: number = 3, cols: number = 3) => {
  const table: TableElement = {
    type: 'table',
    children: Array.from({ length: rows }, () => ({
      type: 'table-row',
      children: Array.from({ length: cols }, () => ({
        type: 'table-cell',
        children: [{ text: '' }]
      }))
    }))
  }
  editor.insertNode(table)
}

export const insertImage = (editor: CustomEditor, url: string, alt?: string) => {
  const image: ImageElement = {
    type: 'image',
    url,
    alt,
    children: [{ text: '' }]
  }
  editor.insertNode(image)
}

export const insertVideo = (editor: CustomEditor, url: string) => {
  const video: VideoElement = {
    type: 'video',
    url,
    children: [{ text: '' }]
  }
  editor.insertNode(video)
}

export const insertDivider = (editor: CustomEditor) => {
  const divider: DividerElement = {
    type: 'divider',
    children: [{ text: '' }]
  }
  editor.insertNode(divider)
}

export const insertFormula = (editor: CustomEditor, expression: string = 'E = mc^2') => {
  const formula: FormulaElement = {
    type: 'formula',
    expression,
    children: [{ text: '' }]
  }
  editor.insertNode(formula)
}
