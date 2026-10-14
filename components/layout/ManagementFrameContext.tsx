'use client'
import { createContext, useContext } from 'react'

export const ManagementFrameContext = createContext(false)
export const useManagementFrame = () => useContext(ManagementFrameContext)
