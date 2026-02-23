import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import { BrowserWindow, ipcMain, dialog, safeStorage } from 'electron'
import schema from './schema'
import Store from 'electron-store'
import log from 'electron-log'
import { ensureDirSync } from 'common/filesystem'
import { IMAGE_EXTENSIONS } from 'common/filesystem/paths'

const DATA_CENTER_NAME = 'dataCenter'

class DataCenter extends EventEmitter {
  constructor (paths) {
    super()

    const { dataCenterPath, userDataPath } = paths
    this.dataCenterPath = dataCenterPath
    this.userDataPath = userDataPath
    this.serviceName = 'marktext'
    this.encryptKeys = ['githubToken']
    this.hasDataCenterFile = fs.existsSync(path.join(this.dataCenterPath, `./${DATA_CENTER_NAME}.json`))
    this.store = new Store({
      schema,
      name: DATA_CENTER_NAME
    })

    this.init()
  }

  init () {
    const defaultData = {
      imageFolderPath: path.join(this.userDataPath, 'images'),
      screenshotFolderPath: path.join(this.userDataPath, 'screenshot'),
      webImages: [],
      cloudImages: [],
      currentUploader: 'none',
      imageBed: {
        github: {
          owner: '',
          repo: '',
          branch: ''
        }
      }
    }

    if (!this.hasDataCenterFile) {
      this.store.set(defaultData)
      ensureDirSync(this.store.get('screenshotFolderPath'))
    }

    this._migrateFromKeytar()
    this._listenForIpcMain()
  }

  async _migrateFromKeytar () {
    const { encryptKeys, serviceName } = this
    const encrypted = this.store.get('_encrypted') || {}

    // Skip if already migrated (any key present in _encrypted)
    if (Object.keys(encrypted).length > 0) return

    try {
      // Use __non_webpack_require__ to avoid webpack bundling keytar (which is no longer a dependency).
      // eslint-disable-next-line camelcase, no-undef
      const keytar = __non_webpack_require__('keytar')
      for (const key of encryptKeys) {
        const value = await keytar.getPassword(serviceName, key)
        if (value) {
          this._encryptAndStore(key, value)
        }
      }
      log.info('Migrated encrypted keys from keytar to safeStorage.')
    } catch (_) {
      // keytar not installed or not available — skip migration silently
    }
  }

  getAll () {
    const { encryptKeys } = this
    const data = this.store.store
    try {
      const encryptObj = {}
      for (const key of encryptKeys) {
        encryptObj[key] = this._decryptFromStore(key)
      }
      return Object.assign(data, encryptObj)
    } catch (err) {
      log.error('Failed to decrypt secure keys:', err)
      return data
    }
  }

  addImage (key, url) {
    const items = this.store.get(key)
    const alreadyHas = items.some(item => item.url === url)
    let item
    if (alreadyHas) {
      item = items.find(item => item.url === url)
      item.timeStamp = +new Date()
    } else {
      item = {
        url,
        timeStamp: +new Date()
      }
      items.push(item)
    }

    ipcMain.emit('broadcast-web-image-added', { type: key, item })
    return this.store.set(key, items)
  }

  removeImage (type, url) {
    const items = this.store.get(type)
    const index = items.indexOf(url)
    const item = items[index]
    if (index === -1) return
    items.splice(index, 1)
    ipcMain.emit('broadcast-web-image-removed', { type, item })
    return this.store.set(type, items)
  }

  /**
   *
   * @param {string} key
   * return a promise
   */
  getItem (key) {
    const { encryptKeys } = this
    if (encryptKeys.includes(key)) {
      return Promise.resolve(this._decryptFromStore(key))
    } else {
      const value = this.store.get(key)
      return Promise.resolve(value)
    }
  }

  setItem (key, value) {
    const { encryptKeys } = this
    if (key === 'screenshotFolderPath') {
      ensureDirSync(value)
    }
    ipcMain.emit('broadcast-user-data-changed', { [key]: value })
    if (encryptKeys.includes(key)) {
      try {
        this._encryptAndStore(key, value)
      } catch (err) {
        log.error('safeStorage error:', err)
      }
    } else {
      return this.store.set(key, value)
    }
  }

  /**
   * Change multiple setting entries.
   *
   * @param {Object.<string, *>} settings A settings object or subset object with key/value entries.
   */
  setItems (settings) {
    if (!settings) {
      log.error('Cannot change settings without entires: object is undefined or null.')
      return
    }

    Object.keys(settings).forEach(key => {
      this.setItem(key, settings[key])
    })
  }

  _encryptAndStore (key, value) {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('safeStorage encryption is not available; storing key in plain text.')
      this.store.set('_encrypted.' + key, value)
      return
    }
    const encrypted = safeStorage.encryptString(value)
    this.store.set('_encrypted.' + key, encrypted.toString('base64'))
  }

  _decryptFromStore (key) {
    const encoded = this.store.get('_encrypted.' + key)
    if (!encoded) return null
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('safeStorage encryption is not available; returning raw value.')
      return encoded
    }
    try {
      const buffer = Buffer.from(encoded, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (err) {
      log.error(`Failed to decrypt key "${key}":`, err)
      return null
    }
  }

  _listenForIpcMain () {
    // local main events
    ipcMain.on('set-image-folder-path', newPath => {
      this.setItem('imageFolderPath', newPath)
    })

    // events from renderer process
    ipcMain.on('mt::ask-for-user-data', async e => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const userData = await this.getAll()
      win.webContents.send('mt::user-preference', userData)
    })

    ipcMain.on('mt::ask-for-modify-image-folder-path', async (e, imagePath) => {
      if (!imagePath) {
        const win = BrowserWindow.fromWebContents(e.sender)
        const { filePaths } = await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'createDirectory']
        })
        if (filePaths && filePaths[0]) {
          imagePath = filePaths[0]
        }
      }
      if (imagePath) {
        this.setItem('imageFolderPath', imagePath)
      }
    })

    ipcMain.on('mt::set-user-data', (e, userData) => {
      this.setItems(userData)
    })

    // TODO: Replace sync. call.
    ipcMain.on('mt::ask-for-image-path', async e => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const { filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{
          name: 'Images',
          extensions: IMAGE_EXTENSIONS
        }]
      })

      if (filePaths && filePaths[0]) {
        e.returnValue = filePaths[0]
      } else {
        e.returnValue = ''
      }
    })
  }
}

export default DataCenter
