import { ipcRenderer } from 'electron'
import bus from '../../bus'

// Listen for context menu action responses from main process
ipcRenderer.on('mt::context-menu-tab-action', (event, { action, tabId }) => {
  const actions = {
    closeThis: () => bus.$emit('TABS::close-this', tabId),
    closeOthers: () => bus.$emit('TABS::close-others', tabId),
    closeSaved: () => bus.$emit('TABS::close-saved'),
    closeAll: () => bus.$emit('TABS::close-all'),
    rename: () => bus.$emit('TABS::rename', tabId),
    copyPath: () => bus.$emit('TABS::copy-path', tabId),
    showInFolder: () => bus.$emit('TABS::show-in-folder', tabId)
  }
  if (actions[action]) actions[action]()
})

export const showContextMenu = (event, tab) => {
  ipcRenderer.send('mt::show-context-menu-tabs', {
    tabId: tab.id,
    pathname: tab.pathname,
    x: event.clientX,
    y: event.clientY
  })
}
