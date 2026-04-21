export interface GitHubRepoInfo {
  owner: string
  repo: string
  name: string
  description: string
  stars: number
  forks: number
  license: string | null
  defaultBranch: string
  topics: string[]
  htmlUrl: string
  hasSkillJson: boolean
  skillJson: GitHubSkillJson | null
  readme: string
}

export interface GitHubSkillJson {
  name: string
  displayName: string
  description: string
  version: string
  author: string
  license: string
  homepage: string
  repository: string
  keywords: string[]
  platforms: string[]
  install: string
}

export interface GitHubSkillInstallResult {
  installPath: string
  name: string
  filesCount: number
}
