function Logger (log) {
  this.writeLog = log;
}

Logger.prototype.log = function (message) {
  if (this.writeLog) {
    console.log(message)
  }
};

module.exports = Logger;
