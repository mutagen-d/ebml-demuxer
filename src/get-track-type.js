const TRACK_TYPES = Object.freeze({
  1: 'video',
  2: 'audio',
  3: 'complex',
  0x10: 'logo',
  0x11: 'subtitle',
  0x12: 'buttons',
  0x20: 'control',
})
const TRACK_NUMBERS = Object.freeze({
  'video': 1,
  'audio': 2,
  'complex': 3,
  'logo': 0x10,
  'subtitle': 0x11,
  'buttons': 0x12,
  'control': 0x20,
})
const MIME_TYPES = Object.freeze({
  'V_VP8': 'vp8',
  'V_VP9': 'vp9',
  'V_AV1': 'av1',
  'A_OPUS': 'opus',
  'A_VORBIS': 'vorbis',
})

/**
 * @param {number} type
 * @returns {TRACK_TYPES[keyof typeof TRACK_TYPES] | 'unknown'}
 */
const getTrackType = (type) => {
  return TRACK_TYPES[type] || 'unknown'
}

/**
 * @param {keyof typeof TRACK_NUMBERS} type
 * @returns {TRACK_NUMBERS[keyof typeof TRACK_NUMBERS] | 0}
 */
const getTrackNumber = (type) => {
  return TRACK_NUMBERS[type] || 0
}

/**
 * @param {string} codec 
 * @returns {MIME_TYPES[keyof typeof MIME_TYPES] | 'vp8,opus'}
 */
const getMimeType = (codec) => {
  return MIME_TYPES[(codec || '').toUpperCase()] || 'vp8,opus'
}

module.exports = { getTrackNumber, getTrackType, getMimeType }