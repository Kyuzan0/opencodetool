import { useState } from 'react'
import { useConfigStore } from '../../stores'
import { Button, Modal, ToggleSwitch } from '../ui'
import { Download, Upload, Archive, CheckCircle } from 'lucide-react'

interface BackupDialogProps {
  open: boolean
  onClose: () => void
  mode: 'backup' | 'restore'
}

export default function BackupDialog({ open, onClose, mode }: BackupDialogProps): JSX.Element {
  const { configPath, agentConfigPath } = useConfigStore()
  const [includeOpenCode, setIncludeOpenCode] = useState(true)
  const [includeAgent, setIncludeAgent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [previewFiles, setPreviewFiles] = useState<string[]>([])

  async function handleBackup(): Promise<void> {
    const paths: string[] = []
    if (includeOpenCode && configPath?.path) paths.push(configPath.path)
    if (includeAgent && agentConfigPath?.path) paths.push(agentConfigPath.path)
    if (paths.length === 0) return

    setLoading(true)
    try {
      const savePath = await window.api.dialog.saveFile({
        defaultPath: `opencode-backup-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })
      if (savePath) {
        await window.api.backup.create(paths, savePath)
        setResult(`Backup saved to ${savePath}`)
      }
    } catch (e: any) {
      setResult(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(): Promise<void> {
    setLoading(true)
    try {
      const zipPath = await window.api.dialog.openFile({
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })
      if (!zipPath) { setLoading(false); return }

      const files = await window.api.backup.preview(zipPath)
      setPreviewFiles(files)

      const targetDir = configPath?.path
        ? configPath.path.replace(/[/\\][^/\\]+$/, '')
        : ''
      if (!targetDir) { setResult('No config directory found'); setLoading(false); return }

      const res = await window.api.backup.restore(zipPath, targetDir)
      setResult(`Restored ${res.restored.length} file(s): ${res.restored.join(', ')}`)
    } catch (e: any) {
      setResult(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleClose(): void {
    setResult(null)
    setPreviewFiles([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === 'backup' ? 'Backup Configs' : 'Restore Configs'}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
          {!result && (
            <Button onClick={mode === 'backup' ? handleBackup : handleRestore} loading={loading}>
              {mode === 'backup' ? <><Archive size={16} /> Create Backup</> : <><Upload size={16} /> Restore</>}
            </Button>
          )}
        </>
      }
    >
      {result ? (
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-success" />
          <p className="text-sm">{result}</p>
        </div>
      ) : mode === 'backup' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Select which configs to include in the backup:</p>
          <ToggleSwitch label="opencode.json" description={configPath?.path || 'Not loaded'} checked={includeOpenCode} onChange={setIncludeOpenCode} />
          <ToggleSwitch label="oh-my-openagent.json" description={agentConfigPath?.path || 'Not loaded'} checked={includeAgent} onChange={setIncludeAgent} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Select a .zip backup file to restore. Existing files will be backed up before overwriting.</p>
          {previewFiles.length > 0 && (
            <div className="rounded border border-border-default p-2">
              <p className="text-xs text-gray-500 mb-1">Files to restore:</p>
              {previewFiles.map((f) => <p key={f} className="text-xs text-gray-300">{f}</p>)}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
