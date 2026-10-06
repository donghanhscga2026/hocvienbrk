import {z} from 'zod'

export const presentationKey=(profileId:number)=>`website-presentation:${profileId}:v1`
export const presentationSchema=z.object({mode:z.enum(['template','custom']),revision:z.number().int().nonnegative()}).strict()
export type WebsitePresentation=z.infer<typeof presentationSchema>
