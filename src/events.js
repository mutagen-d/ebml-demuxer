class EventEmitter {
  constructor() {
    /** 
     * @private
     * @type {{ [event: string]: Array<(...args: any) => any> }} */
    this._listeners = {}
  }

  /**
   * @param {string} event
   */
  listenersCount(event) {
    const listeners = this._listeners[event]
    return listeners ? listeners.length : 0
  }

  events() {
    return Object.keys(this._listeners).filter(event => event !== '*')
  }

  /**
   * @param {string} event 
   * @param  {...any} args 
   */
  emit(event, ...args) {
    const listeners = this._listeners[event] || []
    for (const fn of listeners) {
      try {
        fn(...args)
      } catch (e) {
        console.warn('Error:', e)
      }
    }
    if (event !== '*') {
      this.emit('*', event, ...args)
    }
  }

  /** @param {(event: string, ...args: any) => any} listener */
  onAny(listener) {
    return this.on('*', listener)
  }

  /** @param {(event: string, ...args: any) => any} [listener] */
  offAny(listener) {
    return this.off('*', listener)
  }

  /**
   * @param {string} event 
   * @param {(...args: any) => any} listener 
   */
  on(event, listener) {
    const listeners = this._listeners[event] || []
    const index = listeners.indexOf(listener)
    if (index == -1) {
      listeners.push(listener)
    }
    this._listeners[event] = listeners
    const remove = () => this.off(event, listener)
    return { remove }
  }

  /**
   * @param {string} event 
   * @param {(...args: any) => any} listener 
   */
  once(event, listener) {
    const fn = (...args) => {
      try {
        listener(...args)
      } finally {
        this.off(event, fn)
      }
    }
    return this.on(event, fn)
  }

  /**
   * @param {string} [event]
   * @param {(...args: any) => any} [listener]
   */
  off(event, listener) {
    if (!event) {
      for (const ev of Object.keys(this._listeners)) {
        this._listeners[ev].length = 0
        delete this._listeners[ev]
      }
      return
    }
    const listeners = this._listeners[event]
    if (!listeners) {
      return
    }
    if (!listener) {
      listeners.length = 0
      delete this._listeners[event]
      return
    }
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
    if (!listeners.length) {
      delete this._listeners[event]
    }
  }
}

module.exports = { EventEmitter }