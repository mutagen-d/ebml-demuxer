# EBML Demuxer

A lightweight EBML demuxer for extracting specific tracks from WebM/Matroska files.

## Installation

```
npm install ebml-demuxer
```

or

```
yarn add ebml-demuxer
```

or cdn
```html
<script src="https://cdn.jsdelivr.net/npm/ebml-demuxer@1.0.0/dist/ebml-demuxer.iife.full.min.js"></script>
<script>
  const { EbmlDemuxer } = window.EBMLDemux
</script>
```

## Usage

```js
const { EbmlDemuxer } = require('ebml-demuxer')

const demuxer = new EbmlDemuxer({ tracks: ['video'] }) // or ['video', 'audio'], ['subtitle']

demuxer.on('video', (data, codec) => {
  // Handle video frame data
})

demuxer.on('end', () => {
  console.log('Demuxing complete')
})

demuxer.write(buffer)  // Write EBML data
demuxer.end()          // Signal end of input
```

## API

### `new EbmlDemuxer(options)`

  - `options.tracks` - Array of tracks to extract (`"video"`, `"audio"`, `"subtitle"`, )
  - `options.isLive` - live video demuxing

### Events

  - `"video"`, `[data: Buffer, codec: string]` - Emitted for video frames
  - `"audio"`, `[data: Buffer, codec: string]` - Emitted for audio frames
  - `"subtitle"`, `[data: Buffer, codec: string]` - Emitted for subtitle frames
  - `"end"` - Emitted when processing completes

## Example

```js
const fs = require('fs/promises')
const path = require('path')
const { EbmlDemuxer } = require('ebml-demuxer')

const demuxer = new EbmlDemuxer({ tracks: ['video', 'audio'] })
const videoChunks = []
const audioChunks = []

demuxer.on('video', (data, codec) => videoChunks.push(data))
demuxer.on('audio', (data, codec) => audioChunks.push(data))

demuxer.on('end', async () => {
  console.log('Demuxing complete')
  await Promise.all([
    fs.writeFile(path.join(__dirname, 'video.webm'), Buffer.concat(videoChunks)),
    fs.writeFile(path.join(__dirname, 'audio.webm'), Buffer.concat(audioChunks)),
  ])
})

const main = async () => {
  const buffer = await fs.readFile(path.join(__dirname, 'input.webm'))
  demuxer.write(buffer)
  demuxer.end()
}
main()
```