import { BrowserWindow, clipboard, ipcMain, Menu, MenuItem } from 'electron'
import { isOsx, isWindows } from '../config'

const registerContextMenuHandlers = () => {
  // Tab context menu
  ipcMain.on('mt::show-context-menu-tabs', (event, { tabId, pathname, x, y }) => {
    const menu = new Menu()
    const hasPath = !!pathname
    const actions = [
      { label: 'Close', action: 'closeThis' },
      { label: 'Close others', action: 'closeOthers' },
      { label: 'Close saved tabs', action: 'closeSaved' },
      { label: 'Close all tabs', action: 'closeAll' },
      { type: 'separator' },
      { label: 'Rename', action: 'rename', enabled: hasPath },
      { label: 'Copy path', action: 'copyPath', enabled: hasPath },
      { label: 'Show in folder', action: 'showInFolder', enabled: hasPath }
    ]

    for (const item of actions) {
      if (item.type === 'separator') {
        menu.append(new MenuItem({ type: 'separator' }))
      } else {
        menu.append(new MenuItem({
          label: item.label,
          enabled: item.enabled !== undefined ? item.enabled : true,
          click: () => {
            event.sender.send('mt::context-menu-tab-action', { action: item.action, tabId })
          }
        }))
      }
    }

    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      menu.popup({ window: win, x, y })
    }
  })

  // Sidebar context menu
  ipcMain.on('mt::show-context-menu-sidebar', (event, { hasPathCache, x, y }) => {
    const menu = new Menu()
    const actions = [
      { label: 'New File', action: 'newFile' },
      { label: 'New Directory', action: 'newDirectory' },
      { type: 'separator' },
      { label: 'Copy', action: 'copy' },
      { label: 'Cut', action: 'cut' },
      { label: 'Paste', action: 'paste', enabled: hasPathCache },
      { type: 'separator' },
      { label: 'Rename', action: 'rename' },
      { label: 'Move To Trash', action: 'remove' },
      { type: 'separator' },
      { label: 'Show In Folder', action: 'showInFolder' }
    ]

    for (const item of actions) {
      if (item.type === 'separator') {
        menu.append(new MenuItem({ type: 'separator' }))
      } else {
        menu.append(new MenuItem({
          label: item.label,
          enabled: item.enabled !== undefined ? item.enabled : true,
          click: () => {
            event.sender.send('mt::context-menu-sidebar-action', item.action)
          }
        }))
      }
    }

    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      menu.popup({ window: win, x, y })
    }
  })

  // Titlebar hamburger menu
  ipcMain.on('mt::show-titlebar-menu', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const appMenu = Menu.getApplicationMenu()
    if (win && appMenu) {
      appMenu.popup({ window: win, x, y })
    }
  })

  // Window controls
  ipcMain.on('mt::window-minimize', e => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) win.minimize()
  })

  ipcMain.on('mt::window-toggle-maximize', e => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    if (win.isFullScreen()) {
      win.setFullScreen(false)
    } else if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('mt::window-close', e => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) win.close()
  })

  ipcMain.handle('mt::window-get-state', e => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return {
      isFullScreen: win ? win.isFullScreen() : false,
      isMaximized: win ? win.isMaximized() : false
    }
  })

  // Clipboard file reading (replaces @electron/remote clipboard usage)
  ipcMain.handle('mt::clipboard-read-files', () => {
    if (isOsx) {
      if (!clipboard.has('NSFilenamesPboardType')) return ''
      try {
        const plist = require('plist')
        const result = plist.parse(clipboard.read('NSFilenamesPboardType'))
        return Array.isArray(result) && result.length ? result[0] : ''
      } catch (_) {
        return ''
      }
    } else if (isWindows) {
      const rawFilePath = clipboard.read('FileNameW')
      const filePath = rawFilePath.replace(new RegExp(String.fromCharCode(0), 'g'), '')
      return filePath && typeof filePath === 'string' ? filePath : ''
    }
    return ''
  })
}

export default registerContextMenuHandlers
