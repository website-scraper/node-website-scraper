var Core = require('./lib/core.js');

module.exports.scrape = function(data, callback) {
  return new Core(data).scrape(callback);
};