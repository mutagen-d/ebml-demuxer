const { getTrackType } = require('./get-track-type')

/** @typedef {import('ebml.js/src/types/tag.types.js').Tag} Tag */
/**
 * @param {Array<[string, Tag]>} header
 */
const demuxHeader = (header) => {
  /**
   * @type {{
   *  data: Array<[string, Tag]>
   *  codec?: string
   *  type: ReturnType<typeof getTrackType>
   *  number: number
   * }[]}
   */
  const tracks = []
  const track = {
    data: [],
    value: -1,
    started: false,
    /** @type {string} */
    codec: undefined,
    /** @type {ReturnType<typeof getTrackType>} */
    type: undefined,
  }
  const start = [], end = []
  let tracksStarted = false, tracksEnded = false
  for (const chunk of header) {
    if (chunk[0] === 'start' && chunk[1].name === 'Cluster') {
      break
    }
    if (!tracksStarted) {
      start.push(chunk)
    }
    if (chunk[0] === 'start' && chunk[1].name === 'Tracks') {
      tracksStarted = true
    }
    if (chunk[0] === 'end' && chunk[1].name === 'Tracks') {
      tracksEnded = true
    }
    if (tracksEnded) {
      end.push(chunk)
    }

    if (chunk[0] === 'start' && chunk[1].name === 'TrackEntry') {
      track.started = true
      track.value = -1
      track.data.length = 0
      track.data.push(chunk)
      continue
    }
    if (chunk[0] === 'end' && chunk[1].name === 'TrackEntry') {
      track.data.push(chunk)
      track.started = false
      tracks.push({ number: track.value, codec: track.codec, data: track.data.slice(), type: track.type })
      continue
    }
    if (track.started) {
      track.data.push(chunk)
      switch (chunk[1].name) {
        case 'TrackNumber':
          track.value = chunk[1].value
          break
        case 'CodecID':
          track.codec = chunk[1].value
          break
        case 'TrackType':
          track.type = getTrackType(chunk[1].value)
          break
      }
    }
  }
  return { start, tracks, end }
}

module.exports = { demuxHeader }
