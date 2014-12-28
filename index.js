var fs = require('fs')
var get = require('simple-get')
var ipSet = require('ip-set')
var once = require('once')
var split = require('split')
var zlib = require('zlib')

var blocklistRe = /^\s*[^#].*?\s*:\s*([a-f0-9.:]+?)\s*-\s*([a-f0-9.:]+?)\s*$/

module.exports = function loadIPSet (input, cb) {
  cb = once(cb)
  if (Array.isArray(input) || !input) {
    process.nextTick(function () {
      cb(null, new ipSet(input))
    })
  } else if (/^https?:\/\//.test(input)) {
    get(input, function (err, res) {
      if (err) return cb(err)
      onStream(res)
    })
  } else {
    var f = fs.createReadStream(input).on('error', cb)
    if (/.gz$/.test(input))
      f = f.pipe(zlib.Gunzip())
    onStream(f)
  }

  function onStream (stream) {
    var blocklist = []
    stream
      .on('error', cb)
      .pipe(split())
      .on('data', function (line) {
        var match = blocklistRe.exec(line)
        if (match) blocklist.push({ start: match[1], end: match[2] })
      })
      .on('end', function () {
        cb(null, new ipSet(blocklist))
      })
  }
}
