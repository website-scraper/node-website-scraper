var config = {
  indexFile: 'index.html',
  log: false,
  srcToLoad: [
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
    {
      selector: 'script',
      attributeName: 'src'
    },
    {
      selector: 'link[rel="stylesheet"]',
      attributeName: 'href'
    },
    {
      selector: 'link[rel*="icon"]',
      attributeName: 'href'
    },
  ],
  staticDirectories: [
    {
      directory: 'images',
      extensions: ['.png', '.jpg', '.jpeg', '.gif']
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
};

module.exports = config;