import { createContext, useContext } from 'react'
import type { IDocumentProps } from './Document'

export const DocumentContext = createContext<Pick<IDocumentProps, 'margin'>>({})

export const useDocumentContext = () => useContext(DocumentContext)
