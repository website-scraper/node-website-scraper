var debug = require('debug');
var appName = 'website-scraper';

function getLoggerName (appName, logLevel) {
	return appName + ':' + logLevel;
}

var logLevels = ['error', 'warn', 'info', 'debug', 'log'];

var logger = {};
logLevels.forEach(function createLogForLevel (logLevel) {
	logger[logLevel] = debug(getLoggerName(appName, logLevel));
});

module.exports = logger;
