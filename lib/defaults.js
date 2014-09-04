var config = {
  indexFile: 'index.html',
  srcToLoad: [
    {
      selector: 'link[rel*="icon"]',
      attributeName: 'href'
    },
    {
      selector: 'img',
      attributeName: 'src'
    },
    {
      selector: 'input',
      attributeName: 'src'
    },
    {
      selector: 'object',
      attributeName: 'data'
    },
    {
      selector: 'embed',
      attributeName: 'src'
    },
    {
      selector: 'param[name="movie"]',
      attributeName: 'value'
    },
  ],
  staticDirectories: [
    {
      directory: 'images',
      extensions: ['.png', '.jpg', '.gif']
    },
    {
      directory: 'js',
      extensions: ['.js']
    },
    {
      directory: 'css',
      extensions: ['.css']
    },
    {
      directory: 'fonts',
      extensions: ['.ttf', '.woff', '.eot', '.svg']
    }
  ]
}

module.exports = config;