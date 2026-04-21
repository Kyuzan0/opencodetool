export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  downloadUrl: string
  releaseNotes: string
  publishedAt: string
}

export interface UpdateDownloadProgress {
  percent: number
  transferredBytes: number
  totalBytes: number
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  info?: UpdateInfo
  error?: string
}

export interface UpdateDownloadResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface UpdateInstallResult {
  success: boolean
  error?: string
}
