const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')

const library = 'EBMLDemux'
const base = {
  entry: {
    'ebml-demuxer': './src/index.js',
  },
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    library: {},
  },
  optimization: {
    minimize: false,
  },
}

const full = {
  resolve: {
    alias: {
      stream: "stream-browserify",
    },
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
}

const min = {
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
}
const cdn = {
  externals: {
    'ebml.js': 'EBML',
  },
}
const iife = {
  output: {
    library: {
      name: library,
      type: 'window',
    },
    iife: true,
  },
}
const umd = {
  output: {
    library: {
      name: library,
      type: 'umd',
    },
    globalObject: 'this',
  },
}
const cjs = {
  output: {
    library: {
      type: 'commonjs2',
    },
  },
  externals: [
    'ebml.js',
  ],
}

const configs = [
  merge(base, iife, full, min, {
    output: {
      filename: '[name].iife.full.min.js',
    },
  }),
  merge(base, iife, full, {
    output: {
      filename: '[name].iife.full.js',
    },
  }),
  merge(base, iife, min, cdn, {
    output: {
      filename: '[name].iife.min.js',
    },
  }),
  merge(base, iife, cdn, {
    output: {
      filename: '[name].iife.js',
    },
  }),
  merge(base, umd, full, min, {
    output: {
      filename: '[name].umd.full.min.js',
    },
  }),
  merge(base, umd, full, {
    output: {
      filename: '[name].umd.full.js',
    },
  }),
  merge(base, umd, min, cdn, {
    output: {
      filename: '[name].umd.min.js',
    },
  }),
  merge(base, umd, cdn, {
    output: {
      filename: '[name].umd.js',
    },
  }),
  merge(base, cjs, {
    output: {
      filename: '[name].cjs.js',
    },
  }),
  merge(base, cjs, min, {
    output: {
      filename: '[name].cjs.min.js',
    },
  }),
]

module.exports = [
  ...configs,
]