export interface SmitherySkill {
  id: string
  namespace: string
  slug: string
  displayName: string
  description: string
  prompt: string | null
  gitUrl: string
  categories: string[]
  totalActivations: number
  uniqueUsers: number
  qualityScore: number
  verified: boolean
  externalStars: number
  externalForks: number
}

export interface SmitheryPagination {
  currentPage: number
  pageSize: number
  totalPages: number
  totalCount: number
}

export interface SmitheryListResponse {
  skills: SmitherySkill[]
  pagination: SmitheryPagination
}
