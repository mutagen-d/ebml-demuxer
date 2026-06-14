const { Decoder, Encoder, tools } = require("ebml.js");
const { demuxHeader } = require("./demux-header");
const { getMimeType, getTrackNumber, getTrackType } = require("./get-track-type");
const { EventEmitter } = require("./events");

/**
 * Demuxed tracks emitted as `"video"`, `"audio"`, `"subtitle"` etc. events
 * 
 * - Specify list of required tracks in `options.tracks` array
 * - For live videos use `options.isLive = true`
 * 
 * ```js
 * const fs = require('fs/promises')
 * const path = require('path')
 * const { EbmlDemuxer } = require('ebml-demuxer')
 * 
 * // extract video only
 * const demuxer = new EbmlDemuxer({ tracks: ['video'] })
 * const buffer = await fs.readFile(path.join(__dirname, 'video.webm'))
 * const demuxedBuffers = []
 * demuxer.on('video', (data, codec) => {
 *  demuxedBuffers.push(data)
 * })
 * demuxer.on('end', async () => {
 *  const buffer = Buffer.concat(demuxedBuffers)
 *  await fs.writeFile(path.join(__dirname, 'video-demuxed.webm'), buffer)
 * })
 * demuxer.write(buffer)
 * demuxer.end()
 * ```
 */
class EbmlDemuxer extends EventEmitter {
  /**
   * @param {{
   *  isLive?: boolean,
   *  tracks?: Array<ReturnType<typeof getTrackType>>
   * }} [options]
   */
  constructor(options) {
    super()
    /** @private */
    this.decoder = new Decoder(options)
    this.onDecodedData = this.onDecodedData.bind(this)
    this.onDecodedTrack = this.onDecodedTrack.bind(this)
    this.onEnd = this.onEnd.bind(this)

    this.options = options || {}
    this.options.tracks ||= ['video', 'audio']

    this.decoder.on('data', this.onDecodedData)
    this.on('track-data', this.onDecodedTrack)
    this.decoder.on('end', this.onEnd)
    /** 
     * @private
     * @type {{ encoder: Encoder, onData: (data: Buffer) => any, track: number }[]} */
    this.encoders
    /** 
     * @private
     * @type {Array<[string, import("./demux-header").Tag]>} */
    this.header = []
    /** @private */
    this.headerStarted = false
    /** @private */
    this.headerEnded = false
    /** @type {Map<number, { codec?: string; track: number; type: ReturnType<typeof getTrackType> }>} */
    this.tracks = new Map()

    /** @private */
    this.trackNumbers = this.options.tracks.map(getTrackNumber)

    /** 
     * @private
     * @type {number} */
    this.clusterTimecode = undefined
    /** @private */
    this.clusterStarted = false
  }

  clearListeners() {
    this.decoder.off('data', this.onDecodedData)
    if (this.encoders) {
      this.encoders.forEach(e => e.encoder.off('data', e.onData))
    }
  }

  write(buffer) {
    buffer._isBuffer = true
    this.decoder.write(buffer)
  }

  end() {
    this.decoder.end()
  }

  /** @private */
  onDecodedData(chunk) {
    // Header Started
    if (chunk[0] === 'start' && chunk[1].name === 'EBML') {
      this.header.length = 0
      this.headerStarted = true
      this.headerEnded = false
      this.header.push(chunk)
      return
    }
    const name = chunk[1].name;
    // Header Ended
    if ((name === 'Cluster' || name === 'SimpleBlock' ||  name === 'Timecode') && !this.headerEnded && this.headerStarted) {
      this.demuxHeader(this.header)
      this.headerEnded = true
    }
    if (this.headerStarted && !this.headerEnded) {
      this.header.push(chunk)
    }
    // Cluster Started
    if (chunk[0] === 'start' && chunk[1].name === 'Cluster' && !this.clusterStarted) {
      this.clusterStarted = true
    }
    if (!this.clusterStarted) {
      return
    }
    if (this.decoder.isLive && chunk[1].name === 'Timecode') {
      this.clusterTimecode = typeof this.clusterTimecode === 'number' ? this.clusterTimecode : chunk[1].value
      const buff = Buffer.alloc(chunk[1].dataSize)
      const value = chunk[1].value - this.clusterTimecode
      buff.writeUintBE(value, 0, buff.byteLength)
      chunk[1].data = buff
      chunk[1].value = value
    }
    this.demuxCluster(chunk)
  }

  /** @private */
  demuxHeader() {
    const res = demuxHeader(this.header)
    const tracks = res.tracks.filter(t => this.options.tracks.includes(t.type))
    this.trackNumbers = tracks.map(t => t.number)
    this.tracks.clear()
    for (const track of tracks) {
      this.tracks.set(track.number, { codec: track.codec, track: track.number, type: track.type })
    }
    const tracksInfo = tracks.map(t => ({ number: t.number, codec: t.codec, type: t.type, mime: getMimeType(t.codec) }))
    this.emit('tracks', tracksInfo)
    if (this.encoders) {
      this.encoders.forEach(e => e.encoder.off('data', e.onData))
    }
    this.encoders = tracks.map(t => this.createEncoder(t.number, t.type))
    for (const track of tracks) {
      const header = [...res.start, ...track.data, ...res.end]
      const last = header[header.length - 1]
      if (last[1].name !== 'Segment') {
        const segment = header.find(h => h[1].name === 'Segment')
        if (segment) {
          header.push(['end', segment[1]])
          segment[1].end = -1
        }
      }
      {
        const headEncoder = new Encoder()
        const data = []
        headEncoder.on('data', (buffer) => data.push(buffer))
        header.forEach(chunk => headEncoder.write(chunk))
        headEncoder.end()
        const buffer = Buffer.concat(data)
        this.emit(track.type, buffer, track.codec)
      }
    }
  }

  /**
   * @private
   * @param {[string, import('./demux-header').Tag]} chunk 
   */
  demuxCluster(chunk) {
    if (chunk[1].name === 'SimpleBlock') {
      if (this.trackNumbers.includes(chunk[1].track)) {
        this.emit('track-data', chunk, chunk[1].track)
      }
      return
    }
    for (const track of this.trackNumbers) {
       this.emit('track-data', chunk, track)
    }
  }

  /**
   * @param {number} track
   * @param {ReturnType<typeof getTrackType>} [type]
   */
  createEncoder(track, type) {
    type ||= getTrackType(track)
    const it = this.tracks.get(track)
    const codec = it ? it.codec : undefined
    const encoder = new Encoder()
    const onEncoded = (data) => this.emit(type, data, codec)
    encoder.on('data', onEncoded)
    return { encoder, onData: onEncoded, track, type }
  } 

  /**
   * @private
   * @param {[string, import("./demux-header").Tag]} chunk
   * @param {number} track 
   */
  onDecodedTrack(chunk, track) {
    let enc = this.encoders.find(e => e.track === track)
    if (!enc) {
      enc = this.createEncoder(track)
      this.encoders.push(enc)
    }
    enc.encoder.write(chunk)
  }

  /** @private */
  onEnd() {
    this.emit('end')
  }
}

module.exports = { EbmlDemuxer }