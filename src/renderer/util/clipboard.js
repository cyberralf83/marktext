import { ipcRenderer } from 'electron'

export const guessClipboardFilePath = () => {
  return ipcRenderer.invoke('mt::clipboard-read-files')
}
