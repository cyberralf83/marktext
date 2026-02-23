import { ipcRenderer } from 'electron'
import bus from '../../bus'

// Listen for context menu action responses from main process
ipcRenderer.on('mt::context-menu-sidebar-action', (event, action) => {
  const actions = {
    newFile: () => bus.$emit('SIDEBAR::new', 'file'),
    newDirectory: () => bus.$emit('SIDEBAR::new', 'directory'),
    copy: () => bus.$emit('SIDEBAR::copy-cut', 'copy'),
    cut: () => bus.$emit('SIDEBAR::copy-cut', 'cut'),
    paste: () => bus.$emit('SIDEBAR::paste'),
    rename: () => bus.$emit('SIDEBAR::rename'),
    remove: () => bus.$emit('SIDEBAR::remove'),
    showInFolder: () => bus.$emit('SIDEBAR::show-in-folder')
  }
  if (actions[action]) actions[action]()
})

export const showContextMenu = (event, hasPathCache) => {
  ipcRenderer.send('mt::show-context-menu-sidebar', {
    hasPathCache,
    x: event.clientX,
    y: event.clientY
  })
}
