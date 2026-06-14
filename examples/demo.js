const fs = require('fs/promises')
const path = require('path')
// const { EbmlDemuxer } = require('ebml-demuxer')
const { EbmlDemuxer } = require('../src')

const demuxer = new EbmlDemuxer({ tracks: ['video'] })
const videoChunks = []

demuxer.on('video', (data, codec) => videoChunks.push(data))

demuxer.on('end', async () => {
  console.log('Demuxing complete')
  await Promise.all([
    fs.writeFile(path.join(__dirname, 'output.webm'), Buffer.concat(videoChunks)),
  ])
})

const main = async () => {
  const buffer = await fs.readFile(path.join(__dirname, 'input.webm'))
  demuxer.write(buffer)  // Write EBML data
  demuxer.end()          // Signal end of input
}
main()