'use client'
import { createContext, useContext } from 'react'
import type { PersonalTool } from '@/lib/wi300/personal-space'

export const ManagementFrameContext = createContext(false)
export const useManagementFrame = () => useContext(ManagementFrameContext)
// Dữ liệu chỉ thuộc frame của phiên hiện tại, không lưu cache dùng chung tài khoản.
export const ManagementToolsContext = createContext<{ tools: PersonalTool[]; loading: boolean; failed: boolean } | null>(null)
export const useManagementTools = () => useContext(ManagementToolsContext)
