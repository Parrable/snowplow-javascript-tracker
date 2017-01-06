/*! * Snowplow - The world's most powerful web analytics platform
 *
 * @description JavaScript tracker for Snowplow
 * @version     2.7.0-rc5
 * @author      Alex Dean, Simon Andersson, Anthon Pang, Fred Blundun, Joshua Beemster
 * @copyright   Anthon Pang, Snowplow Analytics Ltd
 * @license     Simplified BSD
 */

/*
 * For technical documentation:
 * https://github.com/snowplow/snowplow/wiki/javascript-tracker
 *
 * For the setup guide:
 * https://github.com/snowplow/snowplow/wiki/javascript-tracker-setup
 * /

/*
 * Browser [In]Compatibility
 * - minimum required ECMAScript: ECMA-262, edition 3
 *
 * Incompatible with these (and earlier) versions of:
 * - IE4 - try..catch and for..in introduced in IE5
 *- IE5 - named anonymous functions, array.push, encodeURIComponent, decodeURIComponent, and getElementsByTagName introduced in IE5.5
 * - Firefox 1.0 and Netscape 8.x - FF1.5 adds array.indexOf, among other things
 * - Mozilla 1.7 and Netscape 6.x-7.x
 * - Netscape 4.8
 * - Opera 6 - Error object (and Presto) introduced in Opera 7
 * - Opera 7
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":2,"ieee754":3,"isarray":4}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: tracker.js
 *
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright
 * 2012-2016 Snowplow Analytics Ltd. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var lodash = require('./lib_managed/lodash'),
    helpers = require('./lib/helpers'),
    object = typeof exports !== 'undefined' ? exports : this,
	windowAlias = window;


object.errorManager = function (core) {

	/**
	 * Send error as self-describing event
	 *
	 * @param message string Message appeared in console
	 * @param filename string Source file (not used)
	 * @param lineno number Line number
	 * @param colno number Column number (not used)
	 * @param error Error error object (not present in all browsers)
	 * @param contexts Array of custom contexts
	 */
	function track(message, filename, lineno, colno, error, contexts) {
		var stack = (error && error.stack) ? error.stack : null;

		core.trackSelfDescribingEvent({
			schema: 'iglu:com.snowplowanalytics.snowplow/application_error/jsonschema/1-0-1',
			data: {
				programmingLanguage: "JAVASCRIPT",
				message: message || "JS Exception. Browser doesn't support ErrorEvent API",
				stackTrace: stack,
				lineNumber: lineno,
				lineColumn: colno,
				fileName: filename
			}
		}, contexts)
	}

	/**
	 * Attach custom contexts using `contextAdder`
	 *
	 * 
	 * @param contextsAdder function to get details from internal browser state
	 * @returns {Array} custom contexts
	 */
	function sendError(errorEvent, commonContexts, contextsAdder) {
		var contexts;
		if (lodash.isFunction(contextsAdder)) {
			contexts = commonContexts.concat(contextsAdder(errorEvent));
		} else {
			contexts = commonContexts;
		}

		track(errorEvent.message, errorEvent.filename, errorEvent.lineno, errorEvent.colno, errorEvent.error, contexts)
	}

	return {

		/**
		 * Track unhandled exception.
		 * This method supposed to be used inside try/catch block or with window.onerror
		 * (contexts won't be attached), but NOT with `addEventListener` - use
		 * `enableErrorTracker` for this
		 *
		 * @param message string Message appeared in console
		 * @param filename string Source file (not used)
		 * @param lineno number Line number
		 * @param colno number Column number (not used)
		 * @param error Error error object (not present in all browsers)
		 * @param contexts Array of custom contexts
		 */
	    trackError: track,

		/**
         * Curried function to enable tracking of unhandled exceptions.
		 * Listen for `error` event and
		 *
		 * @param filter Function ErrorEvent => Bool to check whether error should be tracker
		 * @param contextsAdder Function ErrorEvent => Array<Context> to add custom contexts with
		 *                     internal state based on particular error
		 */
		enableErrorTracking: function (filter, contextsAdder, contexts) {
			/**
			 * Closure callback to filter, contextualize and track unhandled exceptions
			 *
			 * @param errorEvent ErrorEvent passed to event listener
			 */
			function captureError (errorEvent) {
				if (lodash.isFunction(filter) && filter(errorEvent) || filter == null) {
					sendError(errorEvent, contexts, contextsAdder)
				}
			}

			helpers.addEventListener(windowAlias, 'error', captureError, true);
		}
	}
};

},{"./lib/helpers":10,"./lib_managed/lodash":12}],6:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: forms.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var lodash = require('./lib_managed/lodash'),
	helpers = require('./lib/helpers'),
	object = typeof exports !== 'undefined' ? exports : this;

/**
 * Object for handling automatic form tracking
 *
 * @param object core The tracker core
 * @param string trackerId Unique identifier for the tracker instance, used to mark tracked elements
 * @param function contextAdder Function to add common contexts like PerformanceTiming to all events
 * @return object formTrackingManager instance
 */
object.getFormTrackingManager = function (core, trackerId, contextAdder) {

	// Tag names of mutable elements inside a form
	var innerElementTags = ['textarea', 'input', 'select'];

	// Used to mark elements with event listeners
	var trackingMarker = trackerId + 'form';

	// Filter to determine which forms should be tracked
	var formFilter = function () { return true };

	// Filter to determine which form fields should be tracked
	var fieldFilter = function () { return true };

	/*
	 * Get an identifier for a form, input, textarea, or select element
	 */
	function getFormElementName(elt) {
		return elt[lodash.find(['name', 'id', 'type', 'nodeName'], function (propName) {

			// If elt has a child whose name is "id", that element will be returned
			// instead of the actual id of elt unless we ensure that a string is returned
			return elt[propName] && typeof elt[propName] === 'string';
		})];
	}

	/*
	 * Identifies the parent form in which an element is contained
	 */
	function getParentFormName(elt) {
		while (elt && elt.nodeName && elt.nodeName.toUpperCase() !== 'HTML' && elt.nodeName.toUpperCase() !== 'FORM') {
			elt = elt.parentNode;
		}
		if (elt && elt.nodeName && elt.nodeName.toUpperCase() === 'FORM') {
			return getFormElementName(elt);
		}
	}

	/*
	 * Returns a list of the input, textarea, and select elements inside a form along with their values
	 */
	function getInnerFormElements(elt) {
		var innerElements = [];
		lodash.forEach(innerElementTags, function (tagname) {

			var trackedChildren = lodash.filter(elt.getElementsByTagName(tagname), function (child) {
				return child.hasOwnProperty(trackingMarker);
			});

			lodash.forEach(trackedChildren, function (child) {
				if (child.type === 'submit') {
					return;
				}
				var elementJson = {
					name: getFormElementName(child),
					value: child.value,
					nodeName: child.nodeName
				};
				if (child.type && child.nodeName.toUpperCase() === 'INPUT') {
					elementJson.type = child.type;
				}

				if ((child.type === 'checkbox' || child.type === 'radio') && !child.checked) {
					elementJson.value = null;
				}
				innerElements.push(elementJson);
			});
		});

		return innerElements;
	}

	/*
	 * Return function to handle form field change event
	 */
	function getFormChangeListener(context) {
		return function (e) {
			var elt = e.target;
			var type = (elt.nodeName && elt.nodeName.toUpperCase() === 'INPUT') ? elt.type : null;
			var value = (elt.type === 'checkbox' && !elt.checked) ? null : elt.value;
			core.trackFormChange(getParentFormName(elt), getFormElementName(elt), elt.nodeName, type, helpers.getCssClasses(elt), value, contextAdder(context));
		};
	}

	/*
	 * Return function to handle form submission event
	 */
	function getFormSubmissionListener(context) {
		return function (e) {
			var elt = e.target;
			var innerElements = getInnerFormElements(elt);
			core.trackFormSubmission(getFormElementName(elt), helpers.getCssClasses(elt), innerElements, contextAdder(context));
		};
	}

	return {

		/*
		 * Configures form tracking: which forms and fields will be tracked, and the context to attach
		 */
		configureFormTracking: function (config) {
			if (config) {
				formFilter = helpers.getFilter(config.forms, true);
				fieldFilter = helpers.getFilter(config.fields, false);
			}
		},

		/*
		 * Add submission event listeners to all form elements
		 * Add value change event listeners to all mutable inner form elements
		 */
		addFormListeners: function (context) {
			lodash.forEach(document.getElementsByTagName('form'), function (form) {
				if (formFilter(form) && !form[trackingMarker]) {

					lodash.forEach(innerElementTags, function (tagname) {
						lodash.forEach(form.getElementsByTagName(tagname), function (innerElement) {
							if (fieldFilter(innerElement) && !innerElement[trackingMarker]) {
								helpers.addEventListener(innerElement, 'change', getFormChangeListener(context), false);
								innerElement[trackingMarker] = true;
							}
						});
					});

					helpers.addEventListener(form, 'submit', getFormSubmissionListener(context));
					form[trackingMarker] = true;
				}
			});
		}
	};
};

},{"./lib/helpers":10,"./lib_managed/lodash":12}],7:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: queue.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function() {

	var
		lodash = require('./lib_managed/lodash'),
		helpers = require('./lib/helpers'),

		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	/************************************************************
	 * Proxy object
	 * - this allows the caller to continue push()'ing to _snaq
	 *   after the Tracker has been initialized and loaded
	 ************************************************************/

	object.InQueueManager = function(TrackerConstructor, version, mutSnowplowState, asyncQueue, functionName) {

		// Page view ID should be shared between all tracker instances
		var trackerDictionary = {};

		/**
		 * Get an array of trackers to which a function should be applied.
		 *
		 * @param array names List of namespaces to use. If empty, use all namespaces.
		 */
		function getNamedTrackers(names) {
			var namedTrackers = [];

			if (!names || names.length === 0) {
				namedTrackers = lodash.map(trackerDictionary);
			} else {
				for (var i = 0; i < names.length; i++) {
					if (trackerDictionary.hasOwnProperty(names[i])) {
						namedTrackers.push(trackerDictionary[names[i]]);
					} else {
						helpers.warn('Warning: Tracker namespace "' + names[i] + '" not configured');
					}
				}
			}

			if (namedTrackers.length === 0) {
				helpers.warn('Warning: No tracker configured');
			}

			return namedTrackers;
		}

		/**
		 * Legacy support for input of the form _snaq.push(['setCollectorCf', 'd34uzc5hjrimh8'])
		 * 
		 * @param string f Either 'setCollectorCf' or 'setCollectorUrl'
		 * @param string endpoint
		 * @param string namespace Optional tracker name
		 * 
		 * TODO: remove this in 2.1.0
		 */
		function legacyCreateNewNamespace(f, endpoint, namespace) {
			helpers.warn(f + ' is deprecated. Set the collector when a new tracker instance using newTracker.');

			var name;

			if (lodash.isUndefined(namespace)) {
				name = 'sp';
			} else {
				name = namespace;
			}

			createNewNamespace(name);
			trackerDictionary[name][f](endpoint);
		}

		/**
		 * Initiate a new tracker namespace
		 *
		 * @param string namespace
		 * @param string endpoint Of the form d3rkrsqld9gmqf.cloudfront.net
		 */
		function createNewNamespace(namespace, endpoint, argmap) {
			argmap = argmap || {};

			if (!trackerDictionary.hasOwnProperty(namespace)) {
				trackerDictionary[namespace] = new TrackerConstructor(functionName, namespace, version, mutSnowplowState, argmap);
				trackerDictionary[namespace].setCollectorUrl(endpoint);
			} else {
				helpers.warn('Tracker namespace ' + namespace + ' already exists.');
			}
		}

		/**
		 * Output an array of the form ['functionName', [trackerName1, trackerName2, ...]]
		 *
		 * @param string inputString
		 */
		function parseInputString(inputString) {
			var separatedString = inputString.split(':'),
				extractedFunction = separatedString[0],
				extractedNames = (separatedString.length > 1) ? separatedString[1].split(';') : [];

			return [extractedFunction, extractedNames];
		}

		/**
		 * apply wrapper
		 *
		 * @param array parameterArray An array comprising either:
		 *      [ 'methodName', optional_parameters ]
		 * or:
		 *      [ functionObject, optional_parameters ]
		 */
		function applyAsyncFunction() {
			var i, j, f, parameterArray, input, parsedString, names, namedTrackers;

			// Outer loop in case someone push'es in zarg of arrays
			for (i = 0; i < arguments.length; i += 1) {
				parameterArray = arguments[i];

				// Arguments is not an array, so we turn it into one
				input = Array.prototype.shift.call(parameterArray);

				// Custom callback rather than tracker method, called with trackerDictionary as the context
				if (lodash.isFunction(input)) {
					input.apply(trackerDictionary, parameterArray);
					continue;
				}

				parsedString = parseInputString(input);
				f = parsedString[0];
				names = parsedString[1];

				if (f === 'newTracker') {
					createNewNamespace(parameterArray[0], parameterArray[1], parameterArray[2]);
					continue;
				}

				if ((f === 'setCollectorCf' || f === 'setCollectorUrl') && (!names || names.length === 0)) {
					legacyCreateNewNamespace(f, parameterArray[0], parameterArray[1]);
					continue;
				}

				namedTrackers = getNamedTrackers(names);

				for (j = 0; j < namedTrackers.length; j++) {
					namedTrackers[j][f].apply(namedTrackers[j], parameterArray);
				}
			}
		}

		// We need to manually apply any events collected before this initialization
		for (var i = 0; i < asyncQueue.length; i++) {
			applyAsyncFunction(asyncQueue[i]);
		}

		return {
			push: applyAsyncFunction
		};
	};

}());

},{"./lib/helpers":10,"./lib_managed/lodash":12}],8:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: init.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Snowplow Asynchronous Queue

/*
 * Get the name of the global input function
 */

var snowplow = require('./snowplow'),
	queueName,
	queue,
	windowAlias = window;

if (windowAlias.GlobalSnowplowNamespace && windowAlias.GlobalSnowplowNamespace.length > 0) {
	queueName = windowAlias.GlobalSnowplowNamespace.shift();
	queue = windowAlias[queueName];
	queue.q = new snowplow.Snowplow(queue.q, queueName);
} else {
	windowAlias._snaq = windowAlias._snaq || [];
	windowAlias._snaq = new snowplow.Snowplow(windowAlias._snaq, '_snaq');
}

},{"./snowplow":15}],9:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: detectors.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function() {

	var 
		lodash = require('../lib_managed/lodash'),
		murmurhash3_32_gc = require('murmurhash').v3,
		tz = require('jstimezonedetect').jstz.determine(),
		cookie = require('browser-cookie-lite'),

		object = typeof exports !== 'undefined' ? exports : this, // For eventual node.js environment support
		
		windowAlias = window,
		navigatorAlias = navigator,
		screenAlias = screen,
		documentAlias = document;

	/*
	 * Checks whether sessionStorage is available, in a way that
	 * does not throw a SecurityError in Firefox if "always ask"
	 * is enabled for cookies (https://github.com/snowplow/snowplow/issues/163).
	 */
	object.hasSessionStorage = function () {
		try {
			return !!windowAlias.sessionStorage;
		} catch (e) {
			return true; // SecurityError when referencing it means it exists
		}
	};

	/*
	 * Checks whether localStorage is available, in a way that
	 * does not throw a SecurityError in Firefox if "always ask"
	 * is enabled for cookies (https://github.com/snowplow/snowplow/issues/163).
	 */
	object.hasLocalStorage = function () {
		try {
			return !!windowAlias.localStorage;
		} catch (e) {
			return true; // SecurityError when referencing it means it exists
		}
	};

	/*
	 * Checks whether localStorage is accessible
	 * sets and removes an item to handle private IOS5 browsing
	 * (http://git.io/jFB2Xw)
	 */
	object.localStorageAccessible = function() {
		var mod = 'modernizr';
		if (!object.hasLocalStorage()) {
			return false;
		}
		try {
			windowAlias.localStorage.setItem(mod, mod);
			windowAlias.localStorage.removeItem(mod);
			return true;
		} catch(e) {
			return false;
		}
	 };

	/*
	 * Does browser have cookies enabled (for this site)?
	 */
	object.hasCookies = function(testCookieName) {
		var cookieName = testCookieName || 'testcookie';

		if (lodash.isUndefined(navigatorAlias.cookieEnabled)) {
			cookie.cookie(cookieName, '1');
			return cookie.cookie(cookieName) === '1' ? '1' : '0';
		}

		return navigatorAlias.cookieEnabled ? '1' : '0';
	};

	/**
	 * JS Implementation for browser fingerprint.
	 * Does not require any external resources.
	 * Based on https://github.com/carlo/jquery-browser-fingerprint
	 * @return {number} 32-bit positive integer hash 
	 */
	object.detectSignature = function(hashSeed) {

		var fingerprint = [
			navigatorAlias.userAgent,
			[ screenAlias.height, screenAlias.width, screenAlias.colorDepth ].join("x"),
			( new Date() ).getTimezoneOffset(),
			object.hasSessionStorage(),
			object.hasLocalStorage()
		];

		var plugins = [];
		if (navigatorAlias.plugins)
		{
			for(var i = 0; i < navigatorAlias.plugins.length; i++)
			{
				if (navigatorAlias.plugins[i]) {
					var mt = [];
					for(var j = 0; j < navigatorAlias.plugins[i].length; j++) {
						mt.push([navigatorAlias.plugins[i][j].type, navigatorAlias.plugins[i][j].suffixes]);
					}
					plugins.push([navigatorAlias.plugins[i].name + "::" + navigatorAlias.plugins[i].description, mt.join("~")]);
				}
			}
		}
		return murmurhash3_32_gc(fingerprint.join("###") + "###" + plugins.sort().join(";"), hashSeed);
	};

	/*
	 * Returns visitor timezone
	 */
	object.detectTimezone = function() {
		return (typeof (tz) === 'undefined') ? '' : tz.name();
	};

	/**
	 * Gets the current viewport.
	 *
	 * Code based on:
	 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
	 * - http://responsejs.com/labs/dimensions/
	 */
	object.detectViewport = function() {
		var e = windowAlias, a = 'inner';
		if (!('innerWidth' in windowAlias)) {
			a = 'client';
			e = documentAlias.documentElement || documentAlias.body;
		}
		var width = e[a+'Width'];
		var height = e[a+'Height'];
		if (width >= 0 && height >= 0) {
			return width + 'x' + height;
		} else {
			return null;
		}
	};

	/**
	 * Gets the dimensions of the current
	 * document.
	 *
	 * Code based on:
	 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
	 */
	object.detectDocumentSize = function() {
		var de = documentAlias.documentElement, // Alias
			be = documentAlias.body,

			// document.body may not have rendered, so check whether be.offsetHeight is null
			bodyHeight = be ? Math.max(be.offsetHeight, be.scrollHeight) : 0;
		var w = Math.max(de.clientWidth, de.offsetWidth, de.scrollWidth);
		var h = Math.max(de.clientHeight, de.offsetHeight, de.scrollHeight, bodyHeight);
		return isNaN(w) || isNaN(h) ? '' : w + 'x' + h;
	};

	/**
	 * Returns browser features (plugins, resolution, cookies)
	 *
	 * @param boolean useCookies Whether to test for cookies
	 * @param string testCookieName Name to use for the test cookie
	 * @return Object containing browser features
	 */
	object.detectBrowserFeatures = function(useCookies, testCookieName) {
		var i,
			mimeType,
			pluginMap = {
				// document types
				pdf: 'application/pdf',

				// media players
				qt: 'video/quicktime',
				realp: 'audio/x-pn-realaudio-plugin',
				wma: 'application/x-mplayer2',

				// interactive multimedia
				dir: 'application/x-director',
				fla: 'application/x-shockwave-flash',

				// RIA
				java: 'application/x-java-vm',
				gears: 'application/x-googlegears',
				ag: 'application/x-silverlight'
			},
			features = {};

		// General plugin detection
		if (navigatorAlias.mimeTypes && navigatorAlias.mimeTypes.length) {
			for (i in pluginMap) {
				if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
					mimeType = navigatorAlias.mimeTypes[pluginMap[i]];
					features[i] = (mimeType && mimeType.enabledPlugin) ? '1' : '0';
				}
			}
		}

		// Safari and Opera
		// IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
		if (navigatorAlias.constructor === window.Navigator &&
				typeof navigatorAlias.javaEnabled !== 'unknown' &&
				!lodash.isUndefined(navigatorAlias.javaEnabled) &&
				navigatorAlias.javaEnabled()) {
			features.java = '1';
		}

		// Firefox
		if (lodash.isFunction(windowAlias.GearsFactory)) {
			features.gears = '1';
		}

		// Other browser features
		features.res = screenAlias.width + 'x' + screenAlias.height;
		features.cd = screenAlias.colorDepth;
		if (useCookies) {
			features.cookie = object.hasCookies(testCookieName);
		}

		return features;
	};

}());

},{"../lib_managed/lodash":12,"browser-cookie-lite":17,"jstimezonedetect":18,"murmurhash":19}],10:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: Snowplow.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
;(function () {

	var 
		lodash = require('../lib_managed/lodash'),
		cookie = require('browser-cookie-lite'),

		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	/**
	 * Cleans up the page title
	 */
	object.fixupTitle = function (title) {
		if (!lodash.isString(title)) {
			title = title.text || '';

			var tmp = document.getElementsByTagName('title');
			if (tmp && !lodash.isUndefined(tmp[0])) {
				title = tmp[0].text;
			}
		}
		return title;
	};

	/**
	 * Extract hostname from URL
	 */
	object.getHostName = function (url) {
		// scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
		var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'),
			matches = e.exec(url);

		return matches ? matches[1] : url;
	};

	/**
	 * Fix-up domain
	 */
	object.fixupDomain = function (domain) {
		var dl = domain.length;

		// remove trailing '.'
		if (domain.charAt(--dl) === '.') {
			domain = domain.slice(0, dl);
		}
		// remove leading '*'
		if (domain.slice(0, 2) === '*.') {
			domain = domain.slice(1);
		}
		return domain;
	};

	/**
	 * Get page referrer. In the case of a single-page app,
	 * if the URL changes without the page reloading, pass
	 * in the old URL. It will be returned unless overriden
	 * by a "refer(r)er" parameter in the querystring.
	 *
	 * @param string oldLocation Optional.
	 * @return string The referrer
	 */
	object.getReferrer = function (oldLocation) {

		var referrer = '';
		
		var fromQs = object.fromQuerystring('referrer', window.location.href) ||
		object.fromQuerystring('referer', window.location.href);

		// Short-circuit
		if (fromQs) {
			return fromQs;
		}

		// In the case of a single-page app, return the old URL
		if (oldLocation) {
			return oldLocation;
		}

		try {
			referrer = window.top.document.referrer;
		} catch (e) {
			if (window.parent) {
				try {
					referrer = window.parent.document.referrer;
				} catch (e2) {
					referrer = '';
				}
			}
		}
		if (referrer === '') {
			referrer = document.referrer;
		}
		return referrer;
	};

	/**
	 * Cross-browser helper function to add event handler
	 */
	object.addEventListener = function (element, eventType, eventHandler, useCapture) {
		if (element.addEventListener) {
			element.addEventListener(eventType, eventHandler, useCapture);
			return true;
		}
		if (element.attachEvent) {
			return element.attachEvent('on' + eventType, eventHandler);
		}
		element['on' + eventType] = eventHandler;
	};

	/**
	 * Return value from name-value pair in querystring 
	 */
	object.fromQuerystring = function (field, url) {
		var match = new RegExp('^[^#]*[?&]' + field + '=([^&#]*)').exec(url);
		if (!match) {
			return null;
		}
		return decodeURIComponent(match[1].replace(/\+/g, ' '));
	};

	/**
	 * Only log deprecation warnings if they won't cause an error
	 */
	object.warn = function(message) {
		if (typeof console !== 'undefined') {
			console.warn('Snowplow: ' + message);
		}
	};

	/**
	 * List the classes of a DOM element without using elt.classList (for compatibility with IE 9)
	 */
	object.getCssClasses = function (elt) {
		return elt.className.match(/\S+/g) || [];
	};

	/**
	 * Check whether an element has at least one class from a given list
	 */
	function checkClass(elt, classList) {
		var classes = object.getCssClasses(elt),
			i;

		for (i = 0; i < classes.length; i++) {
			if (classList[classes[i]]) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Convert a criterion object to a filter function
	 *
	 * @param object criterion Either {whitelist: [array of allowable strings]}
	 *                             or {blacklist: [array of allowable strings]}
	 *                             or {filter: function (elt) {return whether to track the element}}
	 * @param boolean byClass Whether to whitelist/blacklist based on an element's classes (for forms)
	 *                        or name attribute (for fields)
	 */
	object.getFilter = function (criterion, byClass) {

		// If the criterion argument is not an object, add listeners to all elements
		if (lodash.isArray(criterion) || !lodash.isObject(criterion)) {
			return function () {
				return true;
			};
		}

		if (criterion.hasOwnProperty('filter')) {
			return criterion.filter;
		} else {
			var inclusive = criterion.hasOwnProperty('whitelist');
			var specifiedClasses = criterion.whitelist || criterion.blacklist;
			if (!lodash.isArray(specifiedClasses)) {
				specifiedClasses = [specifiedClasses];
			}

			// Convert the array of classes to an object of the form {class1: true, class2: true, ...}
			var specifiedClassesSet = {};
			for (var i=0; i<specifiedClasses.length; i++) {
				specifiedClassesSet[specifiedClasses[i]] = true;
			}

			if (byClass) {
				return function (elt) {
					return checkClass(elt, specifiedClassesSet) === inclusive;
				};
			} else {
				return function (elt) {
					return elt.name in specifiedClassesSet === inclusive;
				};
			}
		}
	};

	/**
	 * Add a name-value pair to the querystring of a URL
	 *
	 * @param string url URL to decorate
	 * @param string name Name of the querystring pair
	 * @param string value Value of the querystring pair
	 */
	object.decorateQuerystring = function (url, name, value) {
		var initialQsParams = name + '=' + value;
		var hashSplit = url.split('#');
		var qsSplit = hashSplit[0].split('?');
		var beforeQuerystring = qsSplit.shift();
		// Necessary because a querystring may contain multiple question marks
		var querystring = qsSplit.join('?');
		if (!querystring) {
			querystring = initialQsParams;
		} else {
			// Whether this is the first time the link has been decorated
			var initialDecoration = true;
			var qsFields = querystring.split('&');
			for (var i=0; i<qsFields.length; i++) {
				if (qsFields[i].substr(0, name.length + 1) === name + '=') {
					initialDecoration = false;
					qsFields[i] = initialQsParams;
					querystring = qsFields.join('&');
					break;
				}
			}
			if (initialDecoration) {
				querystring = initialQsParams + '&' + querystring;
			}
		}
		hashSplit[0] = beforeQuerystring + '?' + querystring;
		return hashSplit.join('#');
	};

	/**
	 * Attempt to get a value from localStorage
	 *
	 * @param string key
	 * @return string The value obtained from localStorage, or
	 *                undefined if localStorage is inaccessible
	 */
	object.attemptGetLocalStorage = function (key) {
		try {
			return localStorage.getItem(key);
		} catch(e) {}
	};

	/**
	 * Attempt to write a value to localStorage
	 *
	 * @param string key
	 * @param string value
	 * @return boolean Whether the operation succeeded
	 */
	object.attemptWriteLocalStorage = function (key, value) {
		try {
			localStorage.setItem(key, value);
			return true;
		} catch(e) {
			return false;
		}
	};

	/**
	 * Finds the root domain
	 */
	object.findRootDomain = function () {
		var cookiePrefix = '_sp_root_domain_test_';
		var cookieName = cookiePrefix + new Date().getTime();
		var cookieValue = '_test_value_' + new Date().getTime();

		var split = window.location.hostname.split('.');
		var position = split.length - 1;
		while (position >= 0) {
			var currentDomain = split.slice(position, split.length).join('.');
			cookie.cookie(cookieName, cookieValue, 0, '/', currentDomain);
			if (cookie.cookie(cookieName) === cookieValue) {

				// Clean up created cookie(s)
				object.deleteCookie(cookieName, currentDomain);
				var cookieNames = object.getCookiesWithPrefix(cookiePrefix);
				for (var i = 0; i < cookieNames.length; i++) {
					object.deleteCookie(cookieNames[i], currentDomain);
				}

				return currentDomain;
			}
			position -= 1;
		}

		// Cookies cannot be read
		return window.location.hostname;
	};

	/**
	 * Checks whether a value is present within an array
	 *
	 * @param val The value to check for
	 * @param array The array to check within
	 * @return boolean Whether it exists
	 */
	object.isValueInArray = function (val, array) {
		for (var i = 0; i < array.length; i++) {
			if (array[i] === val) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Deletes an arbitrary cookie by setting the expiration date to the past
	 *
	 * @param cookieName The name of the cookie to delete
	 * @param domainName The domain the cookie is in
	 */
	object.deleteCookie = function (cookieName, domainName) {
		cookie.cookie(cookieName, '', -1, '/', domainName);
	};

	/**
	 * Fetches the name of all cookies beginning with a certain prefix
	 *
	 * @param cookiePrefix The prefix to check for
	 * @return array The cookies that begin with the prefix
	 */
	object.getCookiesWithPrefix = function (cookiePrefix) {
		var cookies = document.cookie.split("; ");
		var cookieNames = [];
		for (var i = 0; i < cookies.length; i++) {
			if (cookies[i].substring(0, cookiePrefix.length) === cookiePrefix) {
				cookieNames.push(cookies[i]);
			}
		}
		return cookieNames;
	};

	/**
	 * Parses an object and returns either the
	 * integer or undefined.
	 *
	 * @param obj The object to parse
	 * @return the result of the parse operation
	 */
	object.parseInt = function (obj) {
		var result = parseInt(obj);
		return isNaN(result) ? undefined : result;
	};

	/**
	 * Parses an object and returns either the
	 * number or undefined.
	 *
	 * @param obj The object to parse
	 * @return the result of the parse operation
	 */
	object.parseFloat = function (obj) {
		var result = parseFloat(obj);
		return isNaN(result) ? undefined : result;
	}

}());

},{"../lib_managed/lodash":12,"browser-cookie-lite":17}],11:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: proxies.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function(){

	var
		helpers = require('./helpers'),
		object = typeof exports !== 'undefined' ? exports : this;

	/*
	 * Test whether a string is an IP address
	 */
	function isIpAddress(string) {
		var IPRegExp = new RegExp('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$');
		return IPRegExp.test(string);
	}

	/*
	 * If the hostname is an IP address, look for text indicating
	 * that the page is cached by Yahoo
	 */
	function isYahooCachedPage(hostName) {
		var
			initialDivText,
			cachedIndicator;
		if (isIpAddress(hostName)) {
			try {
				initialDivText = document.body.children[0].children[0].children[0].children[0].children[0].children[0].innerHTML;
				cachedIndicator = 'You have reached the cached page for';
				return initialDivText.slice(0, cachedIndicator.length) === cachedIndicator; 
			} catch (e) {
				return false;
			}
		}
	}

	/*
	 * Extract parameter from URL
	 */
	function getParameter(url, name) {
		// scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
		var e = new RegExp('^(?:https?|ftp)(?::/*(?:[^?]+))([?][^#]+)'),
			matches = e.exec(url),
			result = helpers.fromQuerystring(name, matches[1]);

		return result;
	}

	/*
	 * Fix-up URL when page rendered from search engine cache or translated page.
	 * TODO: it would be nice to generalise this and/or move into the ETL phase.
	 */
	object.fixupUrl = function (hostName, href, referrer) {

		if (hostName === 'translate.googleusercontent.com') {       // Google
			if (referrer === '') {
				referrer = href;
			}
			href = getParameter(href, 'u');
			hostName = helpers.getHostName(href);
		} else if (hostName === 'cc.bingj.com' ||                   // Bing
		hostName === 'webcache.googleusercontent.com' ||            // Google
		isYahooCachedPage(hostName)) {                         // Yahoo (via Inktomi 74.6.0.0/16)
			href = document.links[0].href;
			hostName = helpers.getHostName(href);
		}
		return [hostName, href, referrer];
	};

}());

},{"./helpers":10}],12:[function(require,module,exports){
(function (global){
/**
 * @license
 * lodash 3.10.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash exports="node" include="isArray, isFunction, isString, isObject, isUndefined, map, mapValues, forEach, filter, find" --output src/js/lib_managed/lodash.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '3.10.1';

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      weakMapTag = '[object WeakMap]';

  var arrayBufferTag = '[object ArrayBuffer]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /** Used to detect host constructors (Safari > 5). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^\d+$/;

  /** Used to fix the JScript `[[DontEnum]]` bug. */
  var shadowProps = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
  typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
  typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
  typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
  typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
  typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
  typedArrayTags[dateTag] = typedArrayTags[errorTag] =
  typedArrayTags[funcTag] = typedArrayTags[mapTag] =
  typedArrayTags[numberTag] = typedArrayTags[objectTag] =
  typedArrayTags[regexpTag] = typedArrayTags[setTag] =
  typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

  /** Used to identify `toStringTag` values supported by `_.clone`. */
  var cloneableTags = {};
  cloneableTags[argsTag] = cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
  cloneableTags[dateTag] = cloneableTags[float32Tag] =
  cloneableTags[float64Tag] = cloneableTags[int8Tag] =
  cloneableTags[int16Tag] = cloneableTags[int32Tag] =
  cloneableTags[numberTag] = cloneableTags[objectTag] =
  cloneableTags[regexpTag] = cloneableTags[stringTag] =
  cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
  cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag] = cloneableTags[funcTag] =
  cloneableTags[mapTag] = cloneableTags[setTag] =
  cloneableTags[weakMapTag] = false;

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;

  /** Detect free variable `self`. */
  var freeSelf = objectTypes[typeof self] && self && self.Object && self;

  /** Detect free variable `window`. */
  var freeWindow = objectTypes[typeof window] && window && window.Object && window;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /**
   * Used as a reference to the global object.
   *
   * The `this` value is used if it's the global object to avoid Greasemonkey's
   * restricted `window` object, otherwise the `window` object is used.
   */
  var root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.findIndex` and `_.findLastIndex` without
   * support for callback shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Function} predicate The function invoked per iteration.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseFindIndex(array, predicate, fromRight) {
    var length = array.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Converts `value` to a string if it's not one. An empty string is returned
   * for `null` or `undefined` values.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    return value == null ? '' : (value + '');
  }

  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */
  var isHostObject = (function() {
    try {
      Object({ 'toString': 0 } + '');
    } catch(e) {
      return function() { return false; };
    }
    return function(value) {
      // IE < 9 presents many host objects as `Object` objects that can coerce
      // to strings despite having improperly defined `toString` methods.
      return typeof value.toString != 'function' && typeof (value + '') == 'string';
    };
  }());

  /**
   * Checks if `value` is object-like.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /*--------------------------------------------------------------------------*/

  /** Used for native method references. */
  var arrayProto = Array.prototype,
      errorProto = Error.prototype,
      objectProto = Object.prototype,
      stringProto = String.prototype;

  /** Used to resolve the decompiled source of functions. */
  var fnToString = Function.prototype.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objToString = objectProto.toString;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /** Native method references. */
  var ArrayBuffer = root.ArrayBuffer,
      propertyIsEnumerable = objectProto.propertyIsEnumerable,
      splice = arrayProto.splice,
      Uint8Array = root.Uint8Array;

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeIsArray = getNative(Array, 'isArray'),
      nativeKeys = getNative(Object, 'keys');

  /**
   * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
   * of an array-like value.
   */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /** Used to lookup a type array constructors by `toStringTag`. */
  var ctorByTag = {};
  ctorByTag[float32Tag] = root.Float32Array;
  ctorByTag[float64Tag] = root.Float64Array;
  ctorByTag[int8Tag] = root.Int8Array;
  ctorByTag[int16Tag] = root.Int16Array;
  ctorByTag[int32Tag] = root.Int32Array;
  ctorByTag[uint8Tag] = Uint8Array;
  ctorByTag[uint8ClampedTag] = root.Uint8ClampedArray;
  ctorByTag[uint16Tag] = root.Uint16Array;
  ctorByTag[uint32Tag] = root.Uint32Array;

  /** Used to avoid iterating over non-enumerable properties in IE < 9. */
  var nonEnumProps = {};
  nonEnumProps[arrayTag] = nonEnumProps[dateTag] = nonEnumProps[numberTag] = { 'constructor': true, 'toLocaleString': true, 'toString': true, 'valueOf': true };
  nonEnumProps[boolTag] = nonEnumProps[stringTag] = { 'constructor': true, 'toString': true, 'valueOf': true };
  nonEnumProps[errorTag] = nonEnumProps[funcTag] = nonEnumProps[regexpTag] = { 'constructor': true, 'toString': true };
  nonEnumProps[objectTag] = { 'constructor': true };

  arrayEach(shadowProps, function(key) {
    for (var tag in nonEnumProps) {
      if (hasOwnProperty.call(nonEnumProps, tag)) {
        var props = nonEnumProps[tag];
        props[key] = hasOwnProperty.call(props, key);
      }
    }
  });

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object which wraps `value` to enable implicit chaining.
   * Methods that operate on and return arrays, collections, and functions can
   * be chained together. Methods that retrieve a single value or may return a
   * primitive value will automatically end the chain returning the unwrapped
   * value. Explicit chaining may be enabled using `_.chain`. The execution of
   * chained methods is lazy, that is, execution is deferred until `_#value`
   * is implicitly or explicitly called.
   *
   * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
   * fusion is an optimization strategy which merge iteratee calls; this can help
   * to avoid the creation of intermediate data structures and greatly reduce the
   * number of iteratee executions.
   *
   * Chaining is supported in custom builds as long as the `_#value` method is
   * directly or indirectly included in the build.
   *
   * In addition to lodash methods, wrappers have `Array` and `String` methods.
   *
   * The wrapper `Array` methods are:
   * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`,
   * `splice`, and `unshift`
   *
   * The wrapper `String` methods are:
   * `replace` and `split`
   *
   * The wrapper methods that support shortcut fusion are:
   * `compact`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`,
   * `first`, `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`,
   * `slice`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `toArray`,
   * and `where`
   *
   * The chainable wrapper methods are:
   * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
   * `callback`, `chain`, `chunk`, `commit`, `compact`, `concat`, `constant`,
   * `countBy`, `create`, `curry`, `debounce`, `defaults`, `defaultsDeep`,
   * `defer`, `delay`, `difference`, `drop`, `dropRight`, `dropRightWhile`,
   * `dropWhile`, `fill`, `filter`, `flatten`, `flattenDeep`, `flow`, `flowRight`,
   * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
   * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
   * `invoke`, `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`,
   * `matchesProperty`, `memoize`, `merge`, `method`, `methodOf`, `mixin`,
   * `modArgs`, `negate`, `omit`, `once`, `pairs`, `partial`, `partialRight`,
   * `partition`, `pick`, `plant`, `pluck`, `property`, `propertyOf`, `pull`,
   * `pullAt`, `push`, `range`, `rearg`, `reject`, `remove`, `rest`, `restParam`,
   * `reverse`, `set`, `shuffle`, `slice`, `sort`, `sortBy`, `sortByAll`,
   * `sortByOrder`, `splice`, `spread`, `take`, `takeRight`, `takeRightWhile`,
   * `takeWhile`, `tap`, `throttle`, `thru`, `times`, `toArray`, `toPlainObject`,
   * `transform`, `union`, `uniq`, `unshift`, `unzip`, `unzipWith`, `values`,
   * `valuesIn`, `where`, `without`, `wrap`, `xor`, `zip`, `zipObject`, `zipWith`
   *
   * The wrapper methods that are **not** chainable by default are:
   * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clone`, `cloneDeep`,
   * `deburr`, `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`,
   * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`,
   * `floor`, `get`, `gt`, `gte`, `has`, `identity`, `includes`, `indexOf`,
   * `inRange`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
   * `isEmpty`, `isEqual`, `isError`, `isFinite` `isFunction`, `isMatch`,
   * `isNative`, `isNaN`, `isNull`, `isNumber`, `isObject`, `isPlainObject`,
   * `isRegExp`, `isString`, `isUndefined`, `isTypedArray`, `join`, `kebabCase`,
   * `last`, `lastIndexOf`, `lt`, `lte`, `max`, `min`, `noConflict`, `noop`,
   * `now`, `pad`, `padLeft`, `padRight`, `parseInt`, `pop`, `random`, `reduce`,
   * `reduceRight`, `repeat`, `result`, `round`, `runInContext`, `shift`, `size`,
   * `snakeCase`, `some`, `sortedIndex`, `sortedLastIndex`, `startCase`,
   * `startsWith`, `sum`, `template`, `trim`, `trimLeft`, `trimRight`, `trunc`,
   * `unescape`, `uniqueId`, `value`, and `words`
   *
   * The wrapper method `sample` will return a wrapped value when `n` is provided,
   * otherwise an unwrapped value is returned.
   *
   * @name _
   * @constructor
   * @category Chain
   * @param {*} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var wrapped = _([1, 2, 3]);
   *
   * // returns an unwrapped value
   * wrapped.reduce(function(total, n) {
   *   return total + n;
   * });
   * // => 6
   *
   * // returns a wrapped value
   * var squares = wrapped.map(function(n) {
   *   return n * n;
   * });
   *
   * _.isArray(squares);
   * // => false
   *
   * _.isArray(squares.value());
   * // => true
   */
  function lodash() {
    // No operation performed.
  }

  /**
   * An object environment feature flags.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  var support = lodash.support = {};

  (function(x) {
    var Ctor = function() { this.x = x; },
        object = { '0': x, 'length': x },
        props = [];

    Ctor.prototype = { 'valueOf': x, 'y': x };
    for (var key in new Ctor) { props.push(key); }

    /**
     * Detect if `name` or `message` properties of `Error.prototype` are
     * enumerable by default (IE < 9, Safari < 5.1).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') ||
      propertyIsEnumerable.call(errorProto, 'name');

    /**
     * Detect if `prototype` properties are enumerable by default.
     *
     * Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
     * (if the prototype or a property on the prototype has been set)
     * incorrectly set the `[[Enumerable]]` value of a function's `prototype`
     * property to `true`.
     *
     * @memberOf _.support
     * @type boolean
     */
    support.enumPrototypes = propertyIsEnumerable.call(Ctor, 'prototype');

    /**
     * Detect if properties shadowing those on `Object.prototype` are non-enumerable.
     *
     * In IE < 9 an object's own properties, shadowing non-enumerable ones,
     * are made non-enumerable as well (a.k.a the JScript `[[DontEnum]]` bug).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.nonEnumShadows = !/valueOf/.test(props);

    /**
     * Detect if `Array#shift` and `Array#splice` augment array-like objects
     * correctly.
     *
     * Firefox < 10, compatibility modes of IE 8, and IE < 9 have buggy Array
     * `shift()` and `splice()` functions that fail to remove the last element,
     * `value[0]`, of array-like objects even though the "length" property is
     * set to `0`. The `shift()` method is buggy in compatibility modes of IE 8,
     * while `splice()` is buggy regardless of mode in IE < 9.
     *
     * @memberOf _.support
     * @type boolean
     */
    support.spliceObjects = (splice.call(object, 0, 1), !object[0]);

    /**
     * Detect lack of support for accessing string characters by index.
     *
     * IE < 8 can't access characters by index. IE 8 can only access characters
     * by index on string literals, not string objects.
     *
     * @memberOf _.support
     * @type boolean
     */
    support.unindexedChars = ('x'[0] + Object('x')[0]) != 'xx';
  }(1, 0));

  /*------------------------------------------------------------------------*/

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function arrayCopy(source, array) {
    var index = -1,
        length = source.length;

    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }

  /**
   * A specialized version of `_.forEach` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * A specialized version of `_.filter` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[++resIndex] = value;
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.map` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  /**
   * A specialized version of `_.some` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }

  /**
   * The base implementation of `_.assign` without support for argument juggling,
   * multiple sources, and `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssign(object, source) {
    return source == null
      ? object
      : baseCopy(source, keys(source), object);
  }

  /**
   * Copies properties of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property names to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @returns {Object} Returns `object`.
   */
  function baseCopy(source, props, object) {
    object || (object = {});

    var index = -1,
        length = props.length;

    while (++index < length) {
      var key = props[index];
      object[key] = source[key];
    }
    return object;
  }

  /**
   * The base implementation of `_.callback` which supports specifying the
   * number of arguments to provide to `func`.
   *
   * @private
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param {number} [argCount] The number of arguments to provide to `func`.
   * @returns {Function} Returns the callback.
   */
  function baseCallback(func, thisArg, argCount) {
    var type = typeof func;
    if (type == 'function') {
      return thisArg === undefined
        ? func
        : bindCallback(func, thisArg, argCount);
    }
    if (func == null) {
      return identity;
    }
    if (type == 'object') {
      return baseMatches(func);
    }
    return thisArg === undefined
      ? property(func)
      : baseMatchesProperty(func, thisArg);
  }

  /**
   * The base implementation of `_.clone` without support for argument juggling
   * and `this` binding `customizer` functions.
   *
   * @private
   * @param {*} value The value to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @param {Function} [customizer] The function to customize cloning values.
   * @param {string} [key] The key of `value`.
   * @param {Object} [object] The object `value` belongs to.
   * @param {Array} [stackA=[]] Tracks traversed source objects.
   * @param {Array} [stackB=[]] Associates clones with source counterparts.
   * @returns {*} Returns the cloned value.
   */
  function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
    var result;
    if (customizer) {
      result = object ? customizer(value, key, object) : customizer(value);
    }
    if (result !== undefined) {
      return result;
    }
    if (!isObject(value)) {
      return value;
    }
    var isArr = isArray(value);
    if (isArr) {
      result = initCloneArray(value);
      if (!isDeep) {
        return arrayCopy(value, result);
      }
    } else {
      var tag = objToString.call(value),
          isFunc = tag == funcTag;

      if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
        if (isHostObject(value)) {
          return object ? value : {};
        }
        result = initCloneObject(isFunc ? {} : value);
        if (!isDeep) {
          return baseAssign(result, value);
        }
      } else {
        return cloneableTags[tag]
          ? initCloneByTag(value, tag, isDeep)
          : (object ? value : {});
      }
    }
    // Check for circular references and return its corresponding clone.
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == value) {
        return stackB[length];
      }
    }
    // Add the source value to the stack of traversed objects and associate it with its clone.
    stackA.push(value);
    stackB.push(result);

    // Recursively populate clone (susceptible to call stack limits).
    (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
      result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
    });
    return result;
  }

  /**
   * The base implementation of `_.forEach` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object|string} Returns `collection`.
   */
  var baseEach = createBaseEach(baseForOwn);

  /**
   * The base implementation of `_.filter` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function baseFilter(collection, predicate) {
    var result = [];
    baseEach(collection, function(value, index, collection) {
      if (predicate(value, index, collection)) {
        result.push(value);
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.find`, `_.findLast`, `_.findKey`, and `_.findLastKey`,
   * without support for callback shorthands and `this` binding, which iterates
   * over `collection` using the provided `eachFunc`.
   *
   * @private
   * @param {Array|Object|string} collection The collection to search.
   * @param {Function} predicate The function invoked per iteration.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @param {boolean} [retKey] Specify returning the key of the found element
   *  instead of the element itself.
   * @returns {*} Returns the found element or its key, else `undefined`.
   */
  function baseFind(collection, predicate, eachFunc, retKey) {
    var result;
    eachFunc(collection, function(value, key, collection) {
      if (predicate(value, key, collection)) {
        result = retKey ? key : value;
        return false;
      }
    });
    return result;
  }

  /**
   * The base implementation of `baseForIn` and `baseForOwn` which iterates
   * over `object` properties returned by `keysFunc` invoking `iteratee` for
   * each property. Iteratee functions may exit iteration early by explicitly
   * returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();

  /**
   * The base implementation of `_.forOwn` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return baseFor(object, iteratee, keys);
  }

  /**
   * The base implementation of `get` without support for string paths
   * and default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} path The path of the property to get.
   * @param {string} [pathKey] The key representation of path.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path, pathKey) {
    if (object == null) {
      return;
    }
    object = toObject(object);
    if (pathKey !== undefined && pathKey in object) {
      path = [pathKey];
    }
    var index = 0,
        length = path.length;

    while (object != null && index < length) {
      object = toObject(object)[path[index++]];
    }
    return (index && index == length) ? object : undefined;
  }

  /**
   * The base implementation of `_.isEqual` without support for `this` binding
   * `customizer` functions.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {Function} [customizer] The function to customize comparing values.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
  }

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing objects.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA=[]] Tracks traversed `value` objects.
   * @param {Array} [stackB=[]] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var objIsArr = isArray(object),
        othIsArr = isArray(other),
        objTag = arrayTag,
        othTag = arrayTag;

    if (!objIsArr) {
      objTag = objToString.call(object);
      if (objTag == argsTag) {
        objTag = objectTag;
      } else if (objTag != objectTag) {
        objIsArr = isTypedArray(object);
      }
    }
    if (!othIsArr) {
      othTag = objToString.call(other);
      if (othTag == argsTag) {
        othTag = objectTag;
      } else if (othTag != objectTag) {
        othIsArr = isTypedArray(other);
      }
    }
    var objIsObj = objTag == objectTag && !isHostObject(object),
        othIsObj = othTag == objectTag && !isHostObject(other),
        isSameTag = objTag == othTag;

    if (isSameTag && !(objIsArr || objIsObj)) {
      return equalByTag(object, other, objTag);
    }
    if (!isLoose) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

      if (objIsWrapped || othIsWrapped) {
        return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
      }
    }
    if (!isSameTag) {
      return false;
    }
    // Assume cyclic values are equal.
    // For more information on detecting circular references see https://es5.github.io/#JO.
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == object) {
        return stackB[length] == other;
      }
    }
    // Add `object` and `other` to the stack of traversed objects.
    stackA.push(object);
    stackB.push(other);

    var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

    stackA.pop();
    stackB.pop();

    return result;
  }

  /**
   * The base implementation of `_.isMatch` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Array} matchData The propery names, values, and compare flags to match.
   * @param {Function} [customizer] The function to customize comparing objects.
   * @returns {boolean} Returns `true` if `object` is a match, else `false`.
   */
  function baseIsMatch(object, matchData, customizer) {
    var index = matchData.length,
        length = index,
        noCustomizer = !customizer;

    if (object == null) {
      return !length;
    }
    object = toObject(object);
    while (index--) {
      var data = matchData[index];
      if ((noCustomizer && data[2])
            ? data[1] !== object[data[0]]
            : !(data[0] in object)
          ) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
          objValue = object[key],
          srcValue = data[1];

      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var result = customizer ? customizer(objValue, srcValue, key) : undefined;
        if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * The base implementation of `_.map` without support for callback shorthands
   * and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
        result = isArrayLike(collection) ? Array(collection.length) : [];

    baseEach(collection, function(value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }

  /**
   * The base implementation of `_.matches` which does not clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   */
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      var key = matchData[0][0],
          value = matchData[0][1];

      return function(object) {
        if (object == null) {
          return false;
        }
        object = toObject(object);
        return object[key] === value && (value !== undefined || (key in object));
      };
    }
    return function(object) {
      return baseIsMatch(object, matchData);
    };
  }

  /**
   * The base implementation of `_.matchesProperty` which does not clone `srcValue`.
   *
   * @private
   * @param {string} path The path of the property to get.
   * @param {*} srcValue The value to compare.
   * @returns {Function} Returns the new function.
   */
  function baseMatchesProperty(path, srcValue) {
    var isArr = isArray(path),
        isCommon = isKey(path) && isStrictComparable(srcValue),
        pathKey = (path + '');

    path = toPath(path);
    return function(object) {
      if (object == null) {
        return false;
      }
      var key = pathKey;
      object = toObject(object);
      if ((isArr || !isCommon) && !(key in object)) {
        object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
        if (object == null) {
          return false;
        }
        key = last(path);
        object = toObject(object);
      }
      return object[key] === srcValue
        ? (srcValue !== undefined || (key in object))
        : baseIsEqual(srcValue, object[key], undefined, true);
    };
  }

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : toObject(object)[key];
    };
  }

  /**
   * A specialized version of `baseProperty` which supports deep paths.
   *
   * @private
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new function.
   */
  function basePropertyDeep(path) {
    var pathKey = (path + '');
    path = toPath(path);
    return function(object) {
      return baseGet(object, path, pathKey);
    };
  }

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    start = start == null ? 0 : (+start || 0);
    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = (end === undefined || end > length) ? length : (+end || 0);
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  /**
   * A specialized version of `baseCallback` which only supports `this` binding
   * and specifying the number of arguments to provide to `func`.
   *
   * @private
   * @param {Function} func The function to bind.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {number} [argCount] The number of arguments to provide to `func`.
   * @returns {Function} Returns the callback.
   */
  function bindCallback(func, thisArg, argCount) {
    if (typeof func != 'function') {
      return identity;
    }
    if (thisArg === undefined) {
      return func;
    }
    switch (argCount) {
      case 1: return function(value) {
        return func.call(thisArg, value);
      };
      case 3: return function(value, index, collection) {
        return func.call(thisArg, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(thisArg, accumulator, value, index, collection);
      };
      case 5: return function(value, other, key, object, source) {
        return func.call(thisArg, value, other, key, object, source);
      };
    }
    return function() {
      return func.apply(thisArg, arguments);
    };
  }

  /**
   * Creates a clone of the given array buffer.
   *
   * @private
   * @param {ArrayBuffer} buffer The array buffer to clone.
   * @returns {ArrayBuffer} Returns the cloned array buffer.
   */
  function bufferClone(buffer) {
    var result = new ArrayBuffer(buffer.byteLength),
        view = new Uint8Array(result);

    view.set(new Uint8Array(buffer));
    return result;
  }

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      var length = collection ? getLength(collection) : 0;
      if (!isLength(length)) {
        return eachFunc(collection, iteratee);
      }
      var index = fromRight ? length : -1,
          iterable = toObject(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  /**
   * Creates a base function for `_.forIn` or `_.forInRight`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var iterable = toObject(object),
          props = keysFunc(object),
          length = props.length,
          index = fromRight ? length : -1;

      while ((fromRight ? index-- : ++index < length)) {
        var key = props[index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  /**
   * Creates a `_.find` or `_.findLast` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new find function.
   */
  function createFind(eachFunc, fromRight) {
    return function(collection, predicate, thisArg) {
      predicate = getCallback(predicate, thisArg, 3);
      if (isArray(collection)) {
        var index = baseFindIndex(collection, predicate, fromRight);
        return index > -1 ? collection[index] : undefined;
      }
      return baseFind(collection, predicate, eachFunc);
    };
  }

  /**
   * Creates a function for `_.forEach` or `_.forEachRight`.
   *
   * @private
   * @param {Function} arrayFunc The function to iterate over an array.
   * @param {Function} eachFunc The function to iterate over a collection.
   * @returns {Function} Returns the new each function.
   */
  function createForEach(arrayFunc, eachFunc) {
    return function(collection, iteratee, thisArg) {
      return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
        ? arrayFunc(collection, iteratee)
        : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
    };
  }

  /**
   * Creates a function for `_.mapKeys` or `_.mapValues`.
   *
   * @private
   * @param {boolean} [isMapKeys] Specify mapping keys instead of values.
   * @returns {Function} Returns the new map function.
   */
  function createObjectMapper(isMapKeys) {
    return function(object, iteratee, thisArg) {
      var result = {};
      iteratee = getCallback(iteratee, thisArg, 3);

      baseForOwn(object, function(value, key, object) {
        var mapped = iteratee(value, key, object);
        key = isMapKeys ? mapped : key;
        value = isMapKeys ? value : mapped;
        result[key] = value;
      });
      return result;
    };
  }

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing arrays.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var index = -1,
        arrLength = array.length,
        othLength = other.length;

    if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
      return false;
    }
    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index],
          result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;

      if (result !== undefined) {
        if (result) {
          continue;
        }
        return false;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (isLoose) {
        if (!arraySome(other, function(othValue) {
              return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
            })) {
          return false;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
        return false;
      }
    }
    return true;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag) {
    switch (tag) {
      case boolTag:
      case dateTag:
        // Coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
        return +object == +other;

      case errorTag:
        return object.name == other.name && object.message == other.message;

      case numberTag:
        // Treat `NaN` vs. `NaN` as equal.
        return (object != +object)
          ? other != +other
          : object == +other;

      case regexpTag:
      case stringTag:
        // Coerce regexes to strings and treat strings primitives and string
        // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
        return object == (other + '');
    }
    return false;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing values.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var objProps = keys(object),
        objLength = objProps.length,
        othProps = keys(other),
        othLength = othProps.length;

    if (objLength != othLength && !isLoose) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    var skipCtor = isLoose;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key],
          result = customizer ? customizer(isLoose ? othValue : objValue, isLoose? objValue : othValue, key) : undefined;

      // Recursively compare objects (susceptible to call stack limits).
      if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
        return false;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (!skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor &&
          ('constructor' in object && 'constructor' in other) &&
          !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
            typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the appropriate "callback" function. If the `_.callback` method is
   * customized this function returns the custom method, otherwise it returns
   * the `baseCallback` function. If arguments are provided the chosen function
   * is invoked with them and its result is returned.
   *
   * @private
   * @returns {Function} Returns the chosen function or its result.
   */
  function getCallback(func, thisArg, argCount) {
    var result = lodash.callback || callback;
    result = result === callback ? baseCallback : result;
    return argCount ? result(func, thisArg, argCount) : result;
  }

  /**
   * Gets the "length" property value of `object`.
   *
   * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
   * that affects Safari on at least iOS 8.1-8.3 ARM64.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {*} Returns the "length" value.
   */
  var getLength = baseProperty('length');

  /**
   * Gets the propery names, values, and compare flags of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the match data of `object`.
   */
  function getMatchData(object) {
    var result = pairs(object),
        length = result.length;

    while (length--) {
      result[length][2] = isStrictComparable(result[length][1]);
    }
    return result;
  }

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = object == null ? undefined : object[key];
    return isNative(value) ? value : undefined;
  }

  /**
   * Initializes an array clone.
   *
   * @private
   * @param {Array} array The array to clone.
   * @returns {Array} Returns the initialized clone.
   */
  function initCloneArray(array) {
    var length = array.length,
        result = new array.constructor(length);

    // Add array properties assigned by `RegExp#exec`.
    if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }

  /**
   * Initializes an object clone.
   *
   * @private
   * @param {Object} object The object to clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneObject(object) {
    var Ctor = object.constructor;
    if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
      Ctor = Object;
    }
    return new Ctor;
  }

  /**
   * Initializes an object clone based on its `toStringTag`.
   *
   * **Note:** This function only supports cloning values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to clone.
   * @param {string} tag The `toStringTag` of the object to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneByTag(object, tag, isDeep) {
    var Ctor = object.constructor;
    switch (tag) {
      case arrayBufferTag:
        return bufferClone(object);

      case boolTag:
      case dateTag:
        return new Ctor(+object);

      case float32Tag: case float64Tag:
      case int8Tag: case int16Tag: case int32Tag:
      case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
        // Safari 5 mobile incorrectly has `Object` as the constructor of typed arrays.
        if (Ctor instanceof Ctor) {
          Ctor = ctorByTag[tag];
        }
        var buffer = object.buffer;
        return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

      case numberTag:
      case stringTag:
        return new Ctor(object);

      case regexpTag:
        var result = new Ctor(object.source, reFlags.exec(object));
        result.lastIndex = object.lastIndex;
    }
    return result;
  }

  /**
   * Checks if `value` is array-like.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   */
  function isArrayLike(value) {
    return value != null && isLength(getLength(value));
  }

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }

  /**
   * Checks if the provided arguments are from an iteratee call.
   *
   * @private
   * @param {*} value The potential iteratee value argument.
   * @param {*} index The potential iteratee index or key argument.
   * @param {*} object The potential iteratee object argument.
   * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
   */
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)) {
      var other = object[index];
      return value === value ? (value === other) : (other !== other);
    }
    return false;
  }

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    var type = typeof value;
    if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
      return true;
    }
    if (isArray(value)) {
      return false;
    }
    var result = !reIsDeepProp.test(value);
    return result || (object != null && value in toObject(object));
  }

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   */
  function isLength(value) {
    return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }

  /**
   * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` if suitable for strict
   *  equality comparisons, else `false`.
   */
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }

  /**
   * A fallback implementation of `Object.keys` which creates an array of the
   * own enumerable property names of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function shimKeys(object) {
    var props = keysIn(object),
        propsLength = props.length,
        length = propsLength && object.length;

    var allowIndexes = !!length && isLength(length) &&
      (isArray(object) || isArguments(object) || isString(object));

    var index = -1,
        result = [];

    while (++index < propsLength) {
      var key = props[index];
      if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Converts `value` to an object if it's not one.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {Object} Returns the object.
   */
  function toObject(value) {
    if (lodash.support.unindexedChars && isString(value)) {
      var index = -1,
          length = value.length,
          result = Object(value);

      while (++index < length) {
        result[index] = value.charAt(index);
      }
      return result;
    }
    return isObject(value) ? value : Object(value);
  }

  /**
   * Converts `value` to property path array if it's not one.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {Array} Returns the property path array.
   */
  function toPath(value) {
    if (isArray(value)) {
      return value;
    }
    var result = [];
    baseToString(value).replace(rePropName, function(match, number, quote, string) {
      result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Gets the last element of `array`.
   *
   * @static
   * @memberOf _
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the last element of `array`.
   * @example
   *
   * _.last([1, 2, 3]);
   * // => 3
   */
  function last(array) {
    var length = array ? array.length : 0;
    return length ? array[length - 1] : undefined;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Iterates over elements of `collection`, returning an array of all elements
   * `predicate` returns truthy for. The predicate is bound to `thisArg` and
   * invoked with three arguments: (value, index|key, collection).
   *
   * If a property name is provided for `predicate` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `predicate` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function|Object|string} [predicate=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `predicate`.
   * @returns {Array} Returns the new filtered array.
   * @example
   *
   * _.filter([4, 5, 6], function(n) {
   *   return n % 2 == 0;
   * });
   * // => [4, 6]
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // using the `_.matches` callback shorthand
   * _.pluck(_.filter(users, { 'age': 36, 'active': true }), 'user');
   * // => ['barney']
   *
   * // using the `_.matchesProperty` callback shorthand
   * _.pluck(_.filter(users, 'active', false), 'user');
   * // => ['fred']
   *
   * // using the `_.property` callback shorthand
   * _.pluck(_.filter(users, 'active'), 'user');
   * // => ['barney']
   */
  function filter(collection, predicate, thisArg) {
    var func = isArray(collection) ? arrayFilter : baseFilter;
    predicate = getCallback(predicate, thisArg, 3);
    return func(collection, predicate);
  }

  /**
   * Iterates over elements of `collection`, returning the first element
   * `predicate` returns truthy for. The predicate is bound to `thisArg` and
   * invoked with three arguments: (value, index|key, collection).
   *
   * If a property name is provided for `predicate` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `predicate` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collection
   * @param {Array|Object|string} collection The collection to search.
   * @param {Function|Object|string} [predicate=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `predicate`.
   * @returns {*} Returns the matched element, else `undefined`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36, 'active': true },
   *   { 'user': 'fred',    'age': 40, 'active': false },
   *   { 'user': 'pebbles', 'age': 1,  'active': true }
   * ];
   *
   * _.result(_.find(users, function(chr) {
   *   return chr.age < 40;
   * }), 'user');
   * // => 'barney'
   *
   * // using the `_.matches` callback shorthand
   * _.result(_.find(users, { 'age': 1, 'active': true }), 'user');
   * // => 'pebbles'
   *
   * // using the `_.matchesProperty` callback shorthand
   * _.result(_.find(users, 'active', false), 'user');
   * // => 'fred'
   *
   * // using the `_.property` callback shorthand
   * _.result(_.find(users, 'active'), 'user');
   * // => 'barney'
   */
  var find = createFind(baseEach);

  /**
   * Iterates over elements of `collection` invoking `iteratee` for each element.
   * The `iteratee` is bound to `thisArg` and invoked with three arguments:
   * (value, index|key, collection). Iteratee functions may exit iteration early
   * by explicitly returning `false`.
   *
   * **Note:** As with other "Collections" methods, objects with a "length" property
   * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
   * may be used for object iteration.
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Array|Object|string} Returns `collection`.
   * @example
   *
   * _([1, 2]).forEach(function(n) {
   *   console.log(n);
   * }).value();
   * // => logs each value from left to right and returns the array
   *
   * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
   *   console.log(n, key);
   * });
   * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
   */
  var forEach = createForEach(arrayEach, baseEach);

  /**
   * Creates an array of values by running each element in `collection` through
   * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
   * arguments: (value, index|key, collection).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
   *
   * The guarded methods are:
   * `ary`, `callback`, `chunk`, `clone`, `create`, `curry`, `curryRight`,
   * `drop`, `dropRight`, `every`, `fill`, `flatten`, `invert`, `max`, `min`,
   * `parseInt`, `slice`, `sortBy`, `take`, `takeRight`, `template`, `trim`,
   * `trimLeft`, `trimRight`, `trunc`, `random`, `range`, `sample`, `some`,
   * `sum`, `uniq`, and `words`
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function|Object|string} [iteratee=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Array} Returns the new mapped array.
   * @example
   *
   * function timesThree(n) {
   *   return n * 3;
   * }
   *
   * _.map([1, 2], timesThree);
   * // => [3, 6]
   *
   * _.map({ 'a': 1, 'b': 2 }, timesThree);
   * // => [3, 6] (iteration order is not guaranteed)
   *
   * var users = [
   *   { 'user': 'barney' },
   *   { 'user': 'fred' }
   * ];
   *
   * // using the `_.property` callback shorthand
   * _.map(users, 'user');
   * // => ['barney', 'fred']
   */
  function map(collection, iteratee, thisArg) {
    var func = isArray(collection) ? arrayMap : baseMap;
    iteratee = getCallback(iteratee, thisArg, 3);
    return func(collection, iteratee);
  }

  /*------------------------------------------------------------------------*/

  /**
   * Checks if `value` is classified as an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    return isObjectLike(value) && isArrayLike(value) &&
      hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
  }

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(function() { return arguments; }());
   * // => false
   */
  var isArray = nativeIsArray || function(value) {
    return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
  };

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in older versions of Chrome and Safari which return 'function' for regexes
    // and Safari 8 which returns 'object' for typed array constructors.
    return isObject(value) && objToString.call(value) == funcTag;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is a native function.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
   * @example
   *
   * _.isNative(Array.prototype.push);
   * // => true
   *
   * _.isNative(_);
   * // => false
   */
  function isNative(value) {
    if (value == null) {
      return false;
    }
    if (isFunction(value)) {
      return reIsNative.test(fnToString.call(value));
    }
    return isObjectLike(value) && (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
  }

  /**
   * Checks if `value` is classified as a `String` primitive or object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isString('abc');
   * // => true
   *
   * _.isString(1);
   * // => false
   */
  function isString(value) {
    return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
  }

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  function isTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
  }

  /**
   * Checks if `value` is `undefined`.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   *
   * _.isUndefined(null);
   * // => false
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    var Ctor = object == null ? undefined : object.constructor;
    if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
        (typeof object == 'function' ? lodash.support.enumPrototypes : isArrayLike(object))) {
      return shimKeys(object);
    }
    return isObject(object) ? nativeKeys(object) : [];
  };

  /**
   * Creates an array of the own and inherited enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keysIn(new Foo);
   * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
   */
  function keysIn(object) {
    if (object == null) {
      return [];
    }
    if (!isObject(object)) {
      object = Object(object);
    }
    var length = object.length,
        support = lodash.support;

    length = (length && isLength(length) &&
      (isArray(object) || isArguments(object) || isString(object)) && length) || 0;

    var Ctor = object.constructor,
        index = -1,
        proto = (isFunction(Ctor) && Ctor.prototype) || objectProto,
        isProto = proto === object,
        result = Array(length),
        skipIndexes = length > 0,
        skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error),
        skipProto = support.enumPrototypes && isFunction(object);

    while (++index < length) {
      result[index] = (index + '');
    }
    // lodash skips the `constructor` property when it infers it's iterating
    // over a `prototype` object because IE < 9 can't set the `[[Enumerable]]`
    // attribute of an existing property and the `constructor` property of a
    // prototype defaults to non-enumerable.
    for (var key in object) {
      if (!(skipProto && key == 'prototype') &&
          !(skipErrorProps && (key == 'message' || key == 'name')) &&
          !(skipIndexes && isIndex(key, length)) &&
          !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
        result.push(key);
      }
    }
    if (support.nonEnumShadows && object !== objectProto) {
      var tag = object === stringProto ? stringTag : (object === errorProto ? errorTag : objToString.call(object)),
          nonEnums = nonEnumProps[tag] || nonEnumProps[objectTag];

      if (tag == objectTag) {
        proto = objectProto;
      }
      length = shadowProps.length;
      while (length--) {
        key = shadowProps[length];
        var nonEnum = nonEnums[key];
        if (!(isProto && nonEnum) &&
            (nonEnum ? hasOwnProperty.call(object, key) : object[key] !== proto[key])) {
          result.push(key);
        }
      }
    }
    return result;
  }

  /**
   * Creates an object with the same keys as `object` and values generated by
   * running each own enumerable property of `object` through `iteratee`. The
   * iteratee function is bound to `thisArg` and invoked with three arguments:
   * (value, key, object).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to iterate over.
   * @param {Function|Object|string} [iteratee=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Object} Returns the new mapped object.
   * @example
   *
   * _.mapValues({ 'a': 1, 'b': 2 }, function(n) {
   *   return n * 3;
   * });
   * // => { 'a': 3, 'b': 6 }
   *
   * var users = {
   *   'fred':    { 'user': 'fred',    'age': 40 },
   *   'pebbles': { 'user': 'pebbles', 'age': 1 }
   * };
   *
   * // using the `_.property` callback shorthand
   * _.mapValues(users, 'age');
   * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
   */
  var mapValues = createObjectMapper();

  /**
   * Creates a two dimensional array of the key-value pairs for `object`,
   * e.g. `[[key1, value1], [key2, value2]]`.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the new array of key-value pairs.
   * @example
   *
   * _.pairs({ 'barney': 36, 'fred': 40 });
   * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
   */
  function pairs(object) {
    object = toObject(object);

    var index = -1,
        props = keys(object),
        length = props.length,
        result = Array(length);

    while (++index < length) {
      var key = props[index];
      result[index] = [key, object[key]];
    }
    return result;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a function that invokes `func` with the `this` binding of `thisArg`
   * and arguments of the created function. If `func` is a property name the
   * created callback returns the property value for a given element. If `func`
   * is an object the created callback returns `true` for elements that contain
   * the equivalent object properties, otherwise it returns `false`.
   *
   * @static
   * @memberOf _
   * @alias iteratee
   * @category Utility
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
   * @returns {Function} Returns the callback.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * // wrap to create custom callback shorthands
   * _.callback = _.wrap(_.callback, function(callback, func, thisArg) {
   *   var match = /^(.+?)__([gl]t)(.+)$/.exec(func);
   *   if (!match) {
   *     return callback(func, thisArg);
   *   }
   *   return function(object) {
   *     return match[2] == 'gt'
   *       ? object[match[1]] > match[3]
   *       : object[match[1]] < match[3];
   *   };
   * });
   *
   * _.filter(users, 'age__gt36');
   * // => [{ 'user': 'fred', 'age': 40 }]
   */
  function callback(func, thisArg, guard) {
    if (guard && isIterateeCall(func, thisArg, guard)) {
      thisArg = undefined;
    }
    return isObjectLike(func)
      ? matches(func)
      : baseCallback(func, thisArg);
  }

  /**
   * This method returns the first argument provided to it.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * _.identity(object) === object;
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Creates a function that performs a deep comparison between a given object
   * and `source`, returning `true` if the given object has equivalent property
   * values, else `false`.
   *
   * **Note:** This method supports comparing arrays, booleans, `Date` objects,
   * numbers, `Object` objects, regexes, and strings. Objects are compared by
   * their own, not inherited, enumerable properties. For comparing a single
   * own or inherited property value see `_.matchesProperty`.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * _.filter(users, _.matches({ 'age': 40, 'active': false }));
   * // => [{ 'user': 'fred', 'age': 40, 'active': false }]
   */
  function matches(source) {
    return baseMatches(baseClone(source, true));
  }

  /**
   * Creates a function that returns the property value at `path` on a
   * given object.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var objects = [
   *   { 'a': { 'b': { 'c': 2 } } },
   *   { 'a': { 'b': { 'c': 1 } } }
   * ];
   *
   * _.map(objects, _.property('a.b.c'));
   * // => [2, 1]
   *
   * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
   * // => [1, 2]
   */
  function property(path) {
    return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
  }

  /*------------------------------------------------------------------------*/

  // Add functions that return wrapped values when chaining.
  lodash.callback = callback;
  lodash.filter = filter;
  lodash.forEach = forEach;
  lodash.keys = keys;
  lodash.keysIn = keysIn;
  lodash.map = map;
  lodash.mapValues = mapValues;
  lodash.matches = matches;
  lodash.pairs = pairs;
  lodash.property = property;

  // Add aliases.
  lodash.collect = map;
  lodash.each = forEach;
  lodash.iteratee = callback;
  lodash.select = filter;

  /*------------------------------------------------------------------------*/

  // Add functions that return unwrapped values when chaining.
  lodash.find = find;
  lodash.identity = identity;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isFunction = isFunction;
  lodash.isNative = isNative;
  lodash.isObject = isObject;
  lodash.isString = isString;
  lodash.isTypedArray = isTypedArray;
  lodash.isUndefined = isUndefined;
  lodash.last = last;

  // Add aliases.
  lodash.detect = find;

  /*------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type string
   */
  lodash.VERSION = VERSION;

  /*--------------------------------------------------------------------------*/

  if (freeExports && freeModule) {
    // Export for Node.js or RingoJS.
    if (moduleExports) {
      (freeModule.exports = lodash)._ = lodash;
    }
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: links.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var lodash = require('./lib_managed/lodash'),
	helpers = require('./lib/helpers'),
	object = typeof exports !== 'undefined' ? exports : this;

/**
 * Object for handling automatic link tracking
 *
 * @param object core The tracker core
 * @param string trackerId Unique identifier for the tracker instance, used to mark tracked links
 * @param function contextAdder Function to add common contexts like PerformanceTiming to all events
 * @return object linkTrackingManager instance
 */
object.getLinkTrackingManager = function (core, trackerId, contextAdder) {

	// Filter function used to determine whether clicks on a link should be tracked
	var linkTrackingFilter,

		// Whether pseudo clicks are tracked
		linkTrackingPseudoClicks,

		// Whether to track the  innerHTML of clicked links
		linkTrackingContent,

		// The context attached to link click events
		linkTrackingContext,

		// Internal state of the pseudo click handler
		lastButton,
		lastTarget;

	/*
	 * Process clicks
	 */
	function processClick(sourceElement, context) {

		var parentElement,
			tag,
			elementId,
			elementClasses,
			elementTarget,
			elementContent;

		while ((parentElement = sourceElement.parentNode) !== null &&
				!lodash.isUndefined(parentElement) && // buggy IE5.5
				((tag = sourceElement.tagName.toUpperCase()) !== 'A' && tag !== 'AREA')) {
			sourceElement = parentElement;
		}

		if (!lodash.isUndefined(sourceElement.href)) {
			// browsers, such as Safari, don't downcase hostname and href
			var originalSourceHostName = sourceElement.hostname || helpers.getHostName(sourceElement.href),
				sourceHostName = originalSourceHostName.toLowerCase(),
				sourceHref = sourceElement.href.replace(originalSourceHostName, sourceHostName),
				scriptProtocol = new RegExp('^(javascript|vbscript|jscript|mocha|livescript|ecmascript|mailto):', 'i');

			// Ignore script pseudo-protocol links
			if (!scriptProtocol.test(sourceHref)) {

				elementId = sourceElement.id;
				elementClasses = helpers.getCssClasses(sourceElement);
				elementTarget = sourceElement.target;
				elementContent = linkTrackingContent ? sourceElement.innerHTML : null;

				// decodeUrl %xx
				sourceHref = unescape(sourceHref);
				core.trackLinkClick(sourceHref, elementId, elementClasses, elementTarget, elementContent, contextAdder(context));
			}
		}
	}

	/*
	 * Return function to handle click event
	 */
	function getClickHandler(context) {
		return function (evt) {
			var button,
				target;

			evt = evt || window.event;
			button = evt.which || evt.button;
			target = evt.target || evt.srcElement;

			// Using evt.type (added in IE4), we avoid defining separate handlers for mouseup and mousedown.
			if (evt.type === 'click') {
				if (target) {
					processClick(target, context);
				}
			} else if (evt.type === 'mousedown') {
				if ((button === 1 || button === 2) && target) {
					lastButton = button;
					lastTarget = target;
				} else {
					lastButton = lastTarget = null;
				}
			} else if (evt.type === 'mouseup') {
				if (button === lastButton && target === lastTarget) {
					processClick(target, context);
				}
				lastButton = lastTarget = null;
			}
		};
	}

	/*
	 * Add click listener to a DOM element
	 */
	function addClickListener(element) {
		if (linkTrackingPseudoClicks) {
			// for simplicity and performance, we ignore drag events
			helpers.addEventListener(element, 'mouseup', getClickHandler(linkTrackingContext), false);
			helpers.addEventListener(element, 'mousedown', getClickHandler(linkTrackingContext), false);
		} else {
			helpers.addEventListener(element, 'click', getClickHandler(linkTrackingContext), false);
		}
	}

	return {

		/*
		 * Configures link click tracking: how to filter which links will be tracked,
		 * whether to use pseudo click tracking, and what context to attach to link_click events
		 */
		configureLinkClickTracking: function (criterion, pseudoClicks, trackContent, context) {
			linkTrackingContent = trackContent;
			linkTrackingContext = context;
			linkTrackingPseudoClicks = pseudoClicks;
			linkTrackingFilter = helpers.getFilter(criterion, true);
		},

		/*
		 * Add click handlers to anchor and AREA elements, except those to be ignored
		 */
		addClickListeners: function () {

			var linkElements = document.links,
				i;

			for (i = 0; i < linkElements.length; i++) {
				// Add a listener to link elements which pass the filter and aren't already tracked
				if (linkTrackingFilter(linkElements[i]) && !linkElements[i][trackerId]) {
					addClickListener(linkElements[i]);
					linkElements[i][trackerId] = true;
				}
			}
		}
	};
};

},{"./lib/helpers":10,"./lib_managed/lodash":12}],14:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: out_queue.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function() {

	var
		lodash = require('./lib_managed/lodash'),
		localStorageAccessible = require('./lib/detectors').localStorageAccessible,
		helpers = require('./lib/helpers'),
		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	/**
	 * Object handling sending events to a collector.
	 * Instantiated once per tracker instance.
	 *
	 * @param string functionName The Snowplow function name (used to generate the localStorage key)
	 * @param string namespace The tracker instance's namespace (used to generate the localStorage key)
	 * @param object mutSnowplowState Gives the pageUnloadGuard a reference to the outbound queue
	 *                                so it can unload the page when all queues are empty
	 * @param boolean useLocalStorage Whether to use localStorage at all
	 * @param boolean usePost Whether to send events by POST or GET
	 * @param int bufferSize How many events to batch in localStorage before sending them all.
	 *                       Only applies when sending POST requests and when localStorage is available.
	 * @param int maxPostBytes Maximum combined size in bytes of the event JSONs in a POST request
	 * @return object OutQueueManager instance
	 */
	object.OutQueueManager = function (functionName, namespace, mutSnowplowState, useLocalStorage, usePost, bufferSize, maxPostBytes) {
		var	queueName,
			executingQueue = false,
			configCollectorUrl,
			outQueue;

		// Fall back to GET for browsers which don't support CORS XMLHttpRequests (e.g. IE <= 9)
		usePost = usePost && window.XMLHttpRequest && ('withCredentials' in new XMLHttpRequest());

		var path = usePost ? '/com.snowplowanalytics.snowplow/tp2' : '/i';

		bufferSize = (localStorageAccessible() && useLocalStorage && usePost && bufferSize) || 1;

		// Different queue names for GET and POST since they are stored differently
		queueName = ['snowplowOutQueue', functionName, namespace, usePost ? 'post2' : 'get'].join('_');

		if (useLocalStorage) {
			// Catch any JSON parse errors or localStorage that might be thrown
			try {
				// TODO: backward compatibility with the old version of the queue for POST requests
				outQueue = JSON.parse(localStorage.getItem(queueName));
			}
			catch(e) {}
		}

		// Initialize to and empty array if we didn't get anything out of localStorage
		if (!lodash.isArray(outQueue)) {
			outQueue = [];
		}

		// Used by pageUnloadGuard
		mutSnowplowState.outQueues.push(outQueue);

		if (usePost && bufferSize > 1) {
			mutSnowplowState.bufferFlushers.push(function () {
				if (!executingQueue) {
					executeQueue();
				}
			});
		}

		/*
		 * Convert a dictionary to a querystring
		 * The context field is the last in the querystring
		 */
		function getQuerystring(request) {
			var querystring = '?',
				lowPriorityKeys = {'co': true, 'cx': true},
				firstPair = true;

			for (var key in request) {
				if (request.hasOwnProperty(key) && !(lowPriorityKeys.hasOwnProperty(key))) {
					if (!firstPair) {
						querystring += '&';
					} else {
						firstPair = false;
					}
					querystring += encodeURIComponent(key) + '=' + encodeURIComponent(request[key]);
				}
			}

			for (var contextKey in lowPriorityKeys) {
				if (request.hasOwnProperty(contextKey)  && lowPriorityKeys.hasOwnProperty(contextKey)) {
					querystring += '&' + contextKey + '=' + encodeURIComponent(request[contextKey]);
				}
			}

			return querystring;
		}

		/*
		 * Convert numeric fields to strings to match payload_data schema
		 */
		function getBody(request) {
			var cleanedRequest = lodash.mapValues(request, function (v) {
				return v.toString();
			});
			return {
				evt: cleanedRequest,
				bytes: getUTF8Length(JSON.stringify(cleanedRequest))
			};
		}

		/**
		 * Count the number of bytes a string will occupy when UTF-8 encoded
		 * Taken from http://stackoverflow.com/questions/2848462/count-bytes-in-textarea-using-javascript/
		 *
		 * @param string s
		 * @return number Length of s in bytes when UTF-8 encoded
		 */
		function getUTF8Length(s) {
			var len = 0;
			for (var i = 0; i < s.length; i++) {
				var code = s.charCodeAt(i);
				if (code <= 0x7f) {
					len += 1;
				} else if (code <= 0x7ff) {
					len += 2;
				} else if (code >= 0xd800 && code <= 0xdfff) {
					// Surrogate pair: These take 4 bytes in UTF-8 and 2 chars in UCS-2
					// (Assume next char is the other [valid] half and just skip it)
					len += 4; i++;
				} else if (code < 0xffff) {
					len += 3;
				} else {
					len += 4;
				}
			}
			return len;
		}

		/*
		 * Queue an image beacon for submission to the collector.
		 * If we're not processing the queue, we'll start.
		 */
		function enqueueRequest (request, url) {

			configCollectorUrl = url + path;
			if (usePost) {
				var body = getBody(request);
				if (body.bytes >= maxPostBytes) {
					helpers.warn("Event of size " + body.bytes + " is too long - the maximum size is " + maxPostBytes);
					var xhr = initializeXMLHttpRequest(configCollectorUrl);
					xhr.send(encloseInPayloadDataEnvelope(attachStmToEvent([body.evt])));
					return;
				} else {
					outQueue.push(body);
				}
			} else {
				outQueue.push(getQuerystring(request));
			}
			var savedToLocalStorage = false;
			if (useLocalStorage) {
				savedToLocalStorage = helpers.attemptWriteLocalStorage(queueName, JSON.stringify(outQueue));
			}

			if (!executingQueue && (!savedToLocalStorage || outQueue.length >= bufferSize)) {
				executeQueue();
			}
		}

		/*
		 * Run through the queue of image beacons, sending them one at a time.
		 * Stops processing when we run out of queued requests, or we get an error.
		 */
		function executeQueue () {

			// Failsafe in case there is some way for a bad value like "null" to end up in the outQueue
			while (outQueue.length && typeof outQueue[0] !== 'string' && typeof outQueue[0] !== 'object') {
				outQueue.shift();
			}

			if (outQueue.length < 1) {
				executingQueue = false;
				return;
			}

			// Let's check that we have a Url to ping
			if (!lodash.isString(configCollectorUrl)) {
				throw "No Snowplow collector configured, cannot track";
			}

			executingQueue = true;

			var nextRequest = outQueue[0];

			if (usePost) {

				var xhr = initializeXMLHttpRequest(configCollectorUrl);

				// Time out POST requests after 5 seconds
				var xhrTimeout = setTimeout(function () {
					xhr.abort();
					executingQueue = false;
				}, 5000);

				function chooseHowManyToExecute(q) {
					var numberToSend = 0;
					var byteCount = 0;
					while (numberToSend < q.length) {
						byteCount += q[numberToSend].bytes;
						if (byteCount >= maxPostBytes) {
							break;
						} else {
							numberToSend += 1;
						}
					}
					return numberToSend;
				}

				// Keep track of number of events to delete from queue
				var numberToSend = chooseHowManyToExecute(outQueue);

				xhr.onreadystatechange = function () {
					if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 400) {
						for (var deleteCount = 0; deleteCount < numberToSend; deleteCount++) {
							outQueue.shift();
						}
						if (useLocalStorage) {
							helpers.attemptWriteLocalStorage(queueName, JSON.stringify(outQueue));
						}
						clearTimeout(xhrTimeout);
						executeQueue();
					} else if (xhr.readyState === 4 && xhr.status >= 400) {
						clearTimeout(xhrTimeout);
						executingQueue = false;
					}
				};

				var batch = lodash.map(outQueue.slice(0, numberToSend), function (x) {
					return x.evt;
				});

				if (batch.length > 0) {
					xhr.send(encloseInPayloadDataEnvelope(attachStmToEvent(batch)));
				}

			} else {

				var image = new Image(1, 1);

				image.onload = function () {
					outQueue.shift();
					if (useLocalStorage) {
						helpers.attemptWriteLocalStorage(queueName, JSON.stringify(outQueue));
					}
					executeQueue();
				};

				image.onerror = function () {
					executingQueue = false;
				};

				image.src = configCollectorUrl + nextRequest.replace('?', '?stm=' + new Date().getTime() + '&');
			}
		}

		/**
		 * Open an XMLHttpRequest for a given endpoint with the correct credentials and header
		 *
		 * @param string url The destination URL
		 * @return object The XMLHttpRequest
		 */
		function initializeXMLHttpRequest(url) {
			var xhr = new XMLHttpRequest();
			xhr.open('POST', url, true);
			xhr.withCredentials = true;
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			return xhr;
		}

		/**
		 * Enclose an array of events in a self-describing payload_data JSON string
		 *
		 * @param array events Batch of events
		 * @return string payload_data self-describing JSON
		 */
		function encloseInPayloadDataEnvelope(events) {
			return JSON.stringify({
				schema: 'iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4',
				data: events
			});
		}

		/**
		 * Attaches the STM field to outbound POST events.
		 *
		 * @param events the events to attach the STM to
		 */
		function attachStmToEvent(events) {
			var stm = new Date().getTime().toString();
			for (var i = 0; i < events.length; i++) {
				events[i]['stm'] = stm;
			}
			return events
		}

		return {
			enqueueRequest: enqueueRequest,
			executeQueue: executeQueue
		};
	};

}());

},{"./lib/detectors":9,"./lib/helpers":10,"./lib_managed/lodash":12}],15:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: snowplow.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*jslint browser:true, plusplus:true, vars:true, nomen:true, evil:true */
/*global window */
/*global unescape */
/*global ActiveXObject */
/*global _snaq:true */
/*members encodeURIComponent, decodeURIComponent, getElementsByTagName,
	shift, unshift,
	addEventListener, attachEvent, removeEventListener, detachEvent,
	cookie, domain, readyState, documentElement, doScroll, title, text,
	location, top, document, referrer, parent, links, href, protocol, GearsFactory,
	event, which, button, srcElement, type, target,
	parentNode, tagName, hostname, className,
	userAgent, cookieEnabled, platform, mimeTypes, enabledPlugin, javaEnabled,
	XDomainRequest, XMLHttpRequest, ActiveXObject, open, setRequestHeader, onreadystatechange, setRequestHeader, send, readyState, status,
	getTime, getTimeAlias, setTime, toGMTString, getHours, getMinutes, getSeconds,
	toLowerCase, charAt, indexOf, lastIndexOf, split, slice, toUpperCase,
	onload, src,
	round, random,
	exec,
	res, width, height,
	pdf, qt, realp, wma, dir, fla, java, gears, ag,
	hook, getHook,
	setCollectorCf, setCollectorUrl, setAppId,
	setDownloadExtensions, addDownloadExtensions,
	setDomains, setIgnoreClasses, setRequestMethod,
	setReferrerUrl, setCustomUrl, setDocumentTitle,
	setDownloadClasses, setLinkClasses,
	discardHashTag,
	setCookieNamePrefix, setCookieDomain, setCookiePath, setVisitorIdCookie,
	setVisitorCookieTimeout, setSessionCookieTimeout, setReferralCookieTimeout,
	doNotTrack, respectDoNotTrack, msDoNotTrack, getTimestamp, getCookieValue,
	detectTimezone, detectViewport,
	addListener, enableLinkTracking, enableActivityTracking, setLinkTrackingTimer,
	enableDarkSocialTracking,
	killFrame, redirectFile, setCountPreRendered,
	trackLink, trackPageView, trackImpression,
	addPlugin, getAsyncTracker
*/

;(function() {

	// Load all our modules (at least until we fully modularize & remove grunt-concat)
	var
		uuid = require('uuid'),
		lodash = require('./lib_managed/lodash'),
		helpers = require('./lib/helpers'),
		queue = require('./in_queue'),
		tracker = require('./tracker'),

		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	object.Snowplow = function(asynchronousQueue, functionName) {

		var
			documentAlias = document,
			windowAlias = window,

			/* Tracker identifier with version */
			version = 'js-' + '2.7.0-rc5', // Update banner.js too

			/* Contains four variables that are shared with tracker.js and must be passed by reference */
			mutSnowplowState = {

				/* List of request queues - one per Tracker instance */
				outQueues: [],
				bufferFlushers: [],

				/* Time at which to stop blocking excecution */
				expireDateTime: null,

				/* DOM Ready */
				hasLoaded: false,
				registeredOnLoadHandlers: [],

				/* pageViewId, which can changed by other trackers on page;
				 * initialized by tracker sent first event */
				pageViewId: null
			};

		/************************************************************
		 * Private methods
		 ************************************************************/


		/*
		 * Handle beforeunload event
		 *
		 * Subject to Safari's "Runaway JavaScript Timer" and
		 * Chrome V8 extension that terminates JS that exhibits
		 * "slow unload", i.e., calling getTime() > 1000 times
		 */
		function beforeUnloadHandler() {
			var now;

			// Flush all POST queues
			lodash.forEach(mutSnowplowState.bufferFlushers, function (flusher) {
				flusher();
			});

			/*
			 * Delay/pause (blocks UI)
			 */
			if (mutSnowplowState.expireDateTime) {
				// the things we do for backwards compatibility...
				// in ECMA-262 5th ed., we could simply use:
				//     while (Date.now() < mutSnowplowState.expireDateTime) { }
				do {
					now = new Date();
					if (lodash.filter(mutSnowplowState.outQueues, function (queue) {
						return queue.length > 0;
					}).length === 0) {
						break;
					}
				} while (now.getTime() < mutSnowplowState.expireDateTime);
			}
		}

		/*
		 * Handler for onload event
		 */
		function loadHandler() {
			var i;

			if (!mutSnowplowState.hasLoaded) {
				mutSnowplowState.hasLoaded = true;
				for (i = 0; i < mutSnowplowState.registeredOnLoadHandlers.length; i++) {
					mutSnowplowState.registeredOnLoadHandlers[i]();
				}
			}
			return true;
		}

		/*
		 * Add onload or DOM ready handler
		 */
		function addReadyListener() {
			var _timer;

			if (documentAlias.addEventListener) {
				helpers.addEventListener(documentAlias, 'DOMContentLoaded', function ready() {
					documentAlias.removeEventListener('DOMContentLoaded', ready, false);
					loadHandler();
				});
			} else if (documentAlias.attachEvent) {
				documentAlias.attachEvent('onreadystatechange', function ready() {
					if (documentAlias.readyState === 'complete') {
						documentAlias.detachEvent('onreadystatechange', ready);
						loadHandler();
					}
				});

				if (documentAlias.documentElement.doScroll && windowAlias === windowAlias.top) {
					(function ready() {
						if (!mutSnowplowState.hasLoaded) {
							try {
								documentAlias.documentElement.doScroll('left');
							} catch (error) {
								setTimeout(ready, 0);
								return;
							}
							loadHandler();
						}
					}());
				}
			}

			// sniff for older WebKit versions
			if ((new RegExp('WebKit')).test(navigator.userAgent)) {
				_timer = setInterval(function () {
					if (mutSnowplowState.hasLoaded || /loaded|complete/.test(documentAlias.readyState)) {
						clearInterval(_timer);
						loadHandler();
					}
				}, 10);
			}

			// fallback
			helpers.addEventListener(windowAlias, 'load', loadHandler, false);
		}

		/************************************************************
		 * Public data and methods
		 ************************************************************/

		windowAlias.Snowplow = {

			/**
			 * Returns a Tracker object, configured with a
			 * CloudFront collector.
			 *
			 * @param string distSubdomain The subdomain on your CloudFront collector's distribution
			 */
			getTrackerCf: function (distSubdomain) {
				var t = new tracker.Tracker(functionName, '', version, mutSnowplowState, {});
				t.setCollectorCf(distSubdomain);
				return t;
			},

			/**
			 * Returns a Tracker object, configured with the
			 * URL to the collector to use.
			 *
			 * @param string rawUrl The collector URL minus protocol and /i
			 */
			getTrackerUrl: function (rawUrl) {
				var t = new tracker.Tracker(functionName, '', version, mutSnowplowState, {});
				t.setCollectorUrl(rawUrl);
				return t;
			},

			/**
			 * Get internal asynchronous tracker object
			 *
			 * @return Tracker
			 */
			getAsyncTracker: function () {
				return new tracker.Tracker(functionName, '', version, mutSnowplowState, {});
			}
		};

		/************************************************************
		 * Constructor
		 ************************************************************/

		// initialize the Snowplow singleton
		helpers.addEventListener(windowAlias, 'beforeunload', beforeUnloadHandler, false);
		addReadyListener();

		// Now replace initialization array with queue manager object
		return new queue.InQueueManager(tracker.Tracker, version, mutSnowplowState, asynchronousQueue, functionName);
	};

}());

},{"./in_queue":7,"./lib/helpers":10,"./lib_managed/lodash":12,"./tracker":16,"uuid":29}],16:[function(require,module,exports){
/*
 * JavaScript tracker for Snowplow: tracker.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2016 Snowplow Analytics Ltd. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function() {

	var
		lodash = require('./lib_managed/lodash'),
		helpers = require('./lib/helpers'),
		proxies = require('./lib/proxies'),
		cookie = require('browser-cookie-lite'),
		detectors = require('./lib/detectors'),
		sha1 = require('sha1'),
		links = require('./links'),
		forms = require('./forms'),
		errors = require('./errors'),
		requestQueue = require('./out_queue'),
		coreConstructor = require('snowplow-tracker-core').trackerCore,
		uuid = require('uuid'),

		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	/**
	 * Snowplow Tracker class
	 *
	 * @param functionName global function name
	 * @param namespace The namespace of the tracker object
	 * @param version The current version of the JavaScript Tracker
	 * @param mutSnowplowState An object containing hasLoaded, registeredOnLoadHandlers, and expireDateTime
	 * 	      Passed in by reference in case they are altered by snowplow.js
	 * @param argmap Optional dictionary of configuration options. Supported fields and their default values:
	 *
	 * 1. encodeBase64, true
	 * 2. cookieDomain, null
	 * 3. cookieName, '_sp_'
	 * 4. appId, ''
	 * 5. platform, 'web'
	 * 6. respectDoNotTrack, false
	 * 7. userFingerprint, true
	 * 8. userFingerprintSeed, 123412414
	 * 9. pageUnloadTimer, 500
	 * 10. forceSecureTracker, false
	 * 11. forceUnsecureTracker, false
	 * 12. useLocalStorage, true
	 * 13. useCookies, true
	 * 14. sessionCookieTimeout, 1800
	 * 15. contexts, {}
	 * 16. post, false
	 * 17. bufferSize, 1
	 * 18. crossDomainLinker, false
	 * 19. maxPostBytes, 40000
	 * 20. discoverRootDomain, false
	 * 21. cookieLifetime, 63072000
	 */
	object.Tracker = function Tracker(functionName, namespace, version, mutSnowplowState, argmap) {

		/************************************************************
		 * Private members
		 ************************************************************/
		var
			// Tracker core
			core = coreConstructor(true, function(payload) {
				addBrowserData(payload);
				sendRequest(payload, configTrackerPause);
			}),

			// Aliases
			documentAlias = document,
			windowAlias = window,
			navigatorAlias = navigator,

			// Current URL and Referrer URL
			locationArray = proxies.fixupUrl(documentAlias.domain, windowAlias.location.href, helpers.getReferrer()),
			domainAlias = helpers.fixupDomain(locationArray[0]),
			locationHrefAlias = locationArray[1],
			configReferrerUrl = locationArray[2],

			customReferrer,

			argmap = argmap || {},

			// Request method is always GET for Snowplow
			configRequestMethod = 'GET',

			// Platform defaults to web for this tracker
			configPlatform = argmap.hasOwnProperty('platform') ? argmap.platform : 'web',

			// Snowplow collector URL
			configCollectorUrl,

			// Site ID
			configTrackerSiteId = argmap.hasOwnProperty('appId') ? argmap.appId : '', // Updated for Snowplow

			// Document URL
			configCustomUrl,

			// Document title
			lastDocumentTitle = documentAlias.title,

			// Custom title
			lastConfigTitle,

			// Maximum delay to wait for web bug image to be fetched (in milliseconds)
			configTrackerPause = argmap.hasOwnProperty('pageUnloadTimer') ? argmap.pageUnloadTimer : 500,

			// Minimum visit time after initial page view (in milliseconds)
			configMinimumVisitTime,

			// Recurring heart beat after initial ping (in milliseconds)
			configHeartBeatTimer,

			// Disallow hash tags in URL. TODO: Should this be set to true by default?
			configDiscardHashTag,

			// First-party cookie name prefix
			configCookieNamePrefix = argmap.hasOwnProperty('cookieName') ? argmap.cookieName : '_sp_',

			// First-party cookie domain
			// User agent defaults to origin hostname
			configCookieDomain = argmap.hasOwnProperty('cookieDomain') ? argmap.cookieDomain : null,

			// First-party cookie path
			// Default is user agent defined.
			configCookiePath = '/',

			// Do Not Track browser feature
			dnt = navigatorAlias.doNotTrack || navigatorAlias.msDoNotTrack || windowAlias.doNotTrack,

			// Do Not Track
			configDoNotTrack = argmap.hasOwnProperty('respectDoNotTrack') ? argmap.respectDoNotTrack && (dnt === 'yes' || dnt === '1') : false,

			// Count sites which are pre-rendered
			configCountPreRendered,

			// Life of the visitor cookie (in seconds)
			configVisitorCookieTimeout = argmap.hasOwnProperty('cookieLifetime') ? argmap.cookieLifetime : 63072000, // 2 years

			// Life of the session cookie (in seconds)
			configSessionCookieTimeout = argmap.hasOwnProperty('sessionCookieTimeout') ? argmap.sessionCookieTimeout : 1800, // 30 minutes

			// Default hash seed for MurmurHash3 in detectors.detectSignature
			configUserFingerprintHashSeed = argmap.hasOwnProperty('userFingerprintSeed') ? argmap.userFingerprintSeed : 123412414,

			// Document character set
			documentCharset = documentAlias.characterSet || documentAlias.charset,

			// This forces the tracker to be HTTPS even if the page is not secure
			forceSecureTracker = argmap.hasOwnProperty('forceSecureTracker') ? (argmap.forceSecureTracker === true) : false,

			// This forces the tracker to be HTTP even if the page is secure
			forceUnsecureTracker = !forceSecureTracker && argmap.hasOwnProperty('forceUnsecureTracker') ? (argmap.forceUnsecureTracker === true) : false,

			// Whether to use localStorage to store events between sessions while offline
			useLocalStorage = argmap.hasOwnProperty('useLocalStorage') ? argmap.useLocalStorage : true,

			// Whether to use cookies
			configUseCookies = argmap.hasOwnProperty('useCookies') ? argmap.useCookies : true,

			// Browser language (or Windows language for IE). Imperfect but CloudFront doesn't log the Accept-Language header
			browserLanguage = navigatorAlias.userLanguage || navigatorAlias.language,

			// Browser features via client-side data collection
			browserFeatures = detectors.detectBrowserFeatures(configUseCookies, getSnowplowCookieName('testcookie')),

			// Visitor fingerprint
			userFingerprint = (argmap.userFingerprint === false) ? '' : detectors.detectSignature(configUserFingerprintHashSeed),

			// Unique ID for the tracker instance used to mark links which are being tracked
			trackerId = functionName + '_' + namespace,

			// Guard against installing the activity tracker more than once per Tracker instance
			activityTrackingInstalled = false,

			// Last activity timestamp
			lastActivityTime,

			// The last time an event was fired on the page - used to invalidate session if cookies are disabled
			lastEventTime = new Date().getTime(),

			// How are we scrolling?
			minXOffset,
			maxXOffset,
			minYOffset,
			maxYOffset,

			// Hash function
			hash = sha1,

			// Domain hash value
			domainHash,

			// Domain unique user ID
			domainUserId,

			// ID for the current session
			memorizedSessionId,

			// Index for the current session - kept in memory in case cookies are disabled
			memorizedVisitCount = 1,

			// Business-defined unique user ID
			businessUserId,

			// Ecommerce transaction data
			// Will be committed, sent and emptied by a call to trackTrans.
			ecommerceTransaction = ecommerceTransactionTemplate(),

			// Manager for automatic link click tracking
			linkTrackingManager = links.getLinkTrackingManager(core, trackerId, addCommonContexts),

			// Manager for automatic form tracking
			formTrackingManager = forms.getFormTrackingManager(core, trackerId, addCommonContexts),

			// Manager for tracking unhandled exceptions
			errorManager = errors.errorManager(core),

			// Manager for local storage queue
			outQueueManager = new requestQueue.OutQueueManager(
				functionName,
				namespace,
				mutSnowplowState,
				useLocalStorage,
				argmap.post,
				argmap.bufferSize,
				argmap.maxPostBytes || 40000),

			// Flag to prevent the geolocation context being added multiple times
			geolocationContextAdded = false,

			// Set of contexts to be added to every event
			autoContexts = argmap.contexts || {},

			// Context to be added to every event
			commonContexts = [],

			// Enhanced Ecommerce Contexts to be added on every `trackEnhancedEcommerceAction` call
			enhancedEcommerceContexts = [],

			// Whether pageViewId should be regenerated after each trackPageView. Affect web_page context
			preservePageViewId = false;

		if (argmap.hasOwnProperty('discoverRootDomain') && argmap.discoverRootDomain) {
			configCookieDomain = helpers.findRootDomain();
		}

		if (autoContexts.gaCookies) {
			commonContexts.push(getGaCookiesContext());
		}

		if (autoContexts.geolocation) {
			enableGeolocationContext();
		}

		// Enable base 64 encoding for self-describing events and custom contexts
		core.setBase64Encoding(argmap.hasOwnProperty('encodeBase64') ? argmap.encodeBase64 : true);

		// Set up unchanging name-value pairs
		core.setTrackerVersion(version);
		core.setTrackerNamespace(namespace);
		core.setAppId(configTrackerSiteId);
		core.setPlatform(configPlatform);
		core.setTimezone(detectors.detectTimezone());
		core.addPayloadPair('lang', browserLanguage);
		core.addPayloadPair('cs', documentCharset);

		// Browser features. Cookies, color depth and resolution don't get prepended with f_ (because they're not optional features)
		for (var i in browserFeatures) {
			if (Object.prototype.hasOwnProperty.call(browserFeatures, i)) {
				if (i === 'res' || i === 'cd' || i === 'cookie') {
					core.addPayloadPair(i, browserFeatures[i]);
				} else {
					core.addPayloadPair('f_' + i, browserFeatures[i]);
				}
			}
		}

		/**
		 * Recalculate the domain, URL, and referrer
		 */
		function refreshUrl() {
			locationArray = proxies.fixupUrl(documentAlias.domain, windowAlias.location.href, helpers.getReferrer());

			// If this is a single-page app and the page URL has changed, then:
			//   - if the new URL's querystring contains a "refer(r)er" parameter, use it as the referrer
			//   - otherwise use the old URL as the referer
			if (locationArray[1] !== locationHrefAlias) {
				configReferrerUrl = helpers.getReferrer(locationHrefAlias);
			}

			domainAlias = helpers.fixupDomain(locationArray[0]);
			locationHrefAlias = locationArray[1];
		}

		/**
		 * Decorate the querystring of a single link
		 *
		 * @param event e The event targeting the link
		 */
		function linkDecorationHandler() {
			var tstamp = new Date().getTime();
			if (this.href) {
				this.href = helpers.decorateQuerystring(this.href, '_sp', domainUserId + '.' + tstamp);
			}
		}

		/**
		 * Enable querystring decoration for links pasing a filter
		 * Whenever such a link is clicked on or navigated to via the keyboard,
		 * add "_sp={{duid}}.{{timestamp}}" to its querystring
		 *
		 * @param crossDomainLinker Function used to determine which links to decorate
		 */
		function decorateLinks(crossDomainLinker) {
			for (var i=0; i<documentAlias.links.length; i++) {
				var elt = documentAlias.links[i];
				if (!elt.spDecorationEnabled && crossDomainLinker(elt)) {
					helpers.addEventListener(elt, 'click', linkDecorationHandler, true);
					helpers.addEventListener(elt, 'mousedown', linkDecorationHandler, true);

					// Don't add event listeners more than once
					elt.spDecorationEnabled = true;
				}
			}
		}

		/*
		 * Initializes an empty ecommerce
		 * transaction and line items
		 */
		function ecommerceTransactionTemplate() {
			return {
				transaction: {},
				items: []
			};
		}

		/*
		 * Removes hash tag from the URL
		 *
		 * URLs are purified before being recorded in the cookie,
		 * or before being sent as GET parameters
		 */
		function purify(url) {
			var targetPattern;

			if (configDiscardHashTag) {
				targetPattern = new RegExp('#.*');
				return url.replace(targetPattern, '');
			}
			return url;
		}

		/*
		 * Extract scheme/protocol from URL
		 */
		function getProtocolScheme(url) {
			var e = new RegExp('^([a-z]+):'),
			matches = e.exec(url);

			return matches ? matches[1] : null;
		}

		/*
		 * Resolve relative reference
		 *
		 * Note: not as described in rfc3986 section 5.2
		 */
		function resolveRelativeReference(baseUrl, url) {
			var protocol = getProtocolScheme(url),
				i;

			if (protocol) {
				return url;
			}

			if (url.slice(0, 1) === '/') {
				return getProtocolScheme(baseUrl) + '://' + helpers.getHostName(baseUrl) + url;
			}

			baseUrl = purify(baseUrl);
			if ((i = baseUrl.indexOf('?')) >= 0) {
				baseUrl = baseUrl.slice(0, i);
			}
			if ((i = baseUrl.lastIndexOf('/')) !== baseUrl.length - 1) {
				baseUrl = baseUrl.slice(0, i + 1);
			}

			return baseUrl + url;
		}

		/*
		 * Send request
		 */
		function sendRequest(request, delay) {
			var now = new Date();

			if (!configDoNotTrack) {
				outQueueManager.enqueueRequest(request.build(), configCollectorUrl);
				mutSnowplowState.expireDateTime = now.getTime() + delay;
			}
		}

		/*
		 * Get cookie name with prefix and domain hash
		 */
		function getSnowplowCookieName(baseName) {
			return configCookieNamePrefix + baseName + '.' + domainHash;
		}

		/*
		 * Cookie getter.
		 */
		function getSnowplowCookieValue(cookieName) {
			return cookie.cookie(getSnowplowCookieName(cookieName));
		}

		/*
		 * Update domain hash
		 */
		function updateDomainHash() {
			refreshUrl();
			domainHash = hash((configCookieDomain || domainAlias) + (configCookiePath || '/')).slice(0, 4); // 4 hexits = 16 bits
		}

		/*
		 * Process all "activity" events.
		 * For performance, this function must have low overhead.
		 */
		function activityHandler() {
			var now = new Date();
			lastActivityTime = now.getTime();
		}

		/*
		 * Process all "scroll" events.
		 */
		function scrollHandler() {
			updateMaxScrolls();
			activityHandler();
		}

		/*
		 * Returns [pageXOffset, pageYOffset].
		 * Adapts code taken from: http://www.javascriptkit.com/javatutors/static2.shtml
		 */
		function getPageOffsets() {
			var iebody = (documentAlias.compatMode && documentAlias.compatMode !== "BackCompat") ?
				documentAlias.documentElement :
				documentAlias.body;
			return [iebody.scrollLeft || windowAlias.pageXOffset, iebody.scrollTop || windowAlias.pageYOffset];
		}

		/*
		 * Quick initialization/reset of max scroll levels
		 */
		function resetMaxScrolls() {
			var offsets = getPageOffsets();

			var x = offsets[0];
			minXOffset = x;
			maxXOffset = x;

			var y = offsets[1];
			minYOffset = y;
			maxYOffset = y;
		}

		/*
		 * Check the max scroll levels, updating as necessary
		 */
		function updateMaxScrolls() {
			var offsets = getPageOffsets();

			var x = offsets[0];
			if (x < minXOffset) {
				minXOffset = x;
			} else if (x > maxXOffset) {
				maxXOffset = x;
			}

			var y = offsets[1];
			if (y < minYOffset) {
				minYOffset = y;
			} else if (y > maxYOffset) {
				maxYOffset = y;
			}
		}

		/*
		 * Prevents offsets from being decimal or NaN
		 * See https://github.com/snowplow/snowplow-javascript-tracker/issues/324
		 * TODO: the NaN check should be moved into the core
		 */
		function cleanOffset(offset) {
			var rounded = Math.round(offset);
			if (!isNaN(rounded)) {
				return rounded;
			}
		}

		/*
		 * Sets or renews the session cookie
		 */
		function setSessionCookie() {
			cookie.cookie(getSnowplowCookieName('ses'), '*', configSessionCookieTimeout, configCookiePath, configCookieDomain);
		}

		/*
		 * Sets the Visitor ID cookie: either the first time loadDomainUserIdCookie is called
		 * or when there is a new visit or a new page view
		 */
		function setDomainUserIdCookie(_domainUserId, createTs, visitCount, nowTs, lastVisitTs, sessionId) {
			cookie.cookie(
				getSnowplowCookieName('id'),
				_domainUserId + '.' + createTs + '.' + visitCount + '.' + nowTs + '.' + lastVisitTs + '.' + sessionId,
				configVisitorCookieTimeout,
				configCookiePath,
				configCookieDomain);
		}

		/**
		 * Generate a pseudo-unique ID to fingerprint this user
		 */
		function createNewDomainUserId() {
			return uuid.v4();
		}

		/*
		 * Load the domain user ID and the session ID
		 * Set the cookies (if cookies are enabled)
		 */
		function initializeIdsAndCookies() {
			var sesCookieSet = configUseCookies && !!getSnowplowCookieValue('ses');
			var idCookieComponents = loadDomainUserIdCookie();

			if (idCookieComponents[1]) {
				domainUserId = idCookieComponents[1];
			} else {
				domainUserId = createNewDomainUserId();
				idCookieComponents[1] = domainUserId;
			}

			memorizedSessionId = idCookieComponents[6];

			if (!sesCookieSet) {

				// Increment the session ID
				idCookieComponents[3] ++;

				// Create a new sessionId
				memorizedSessionId = uuid.v4();
				idCookieComponents[6] = memorizedSessionId;
				// Set lastVisitTs to currentVisitTs
				idCookieComponents[5] = idCookieComponents[4];
			}

			if (configUseCookies) {
				setSessionCookie();
				// Update currentVisitTs
				idCookieComponents[4] = Math.round(new Date().getTime() / 1000);
				idCookieComponents.shift();
				setDomainUserIdCookie.apply(null, idCookieComponents);
			}
		}

		/*
		 * Load visitor ID cookie
		 */
		function loadDomainUserIdCookie() {
			if (!configUseCookies) {
				return [];
			}
			var now = new Date(),
				nowTs = Math.round(now.getTime() / 1000),
				id = getSnowplowCookieValue('id'),
				tmpContainer;

			if (id) {
				tmpContainer = id.split('.');
				// New visitor set to 0 now
				tmpContainer.unshift('0');
			} else {

				tmpContainer = [
					// New visitor
					'1',
					// Domain user ID
					domainUserId,
					// Creation timestamp - seconds since Unix epoch
					nowTs,
					// visitCount - 0 = no previous visit
					0,
					// Current visit timestamp
					nowTs,
					// Last visit timestamp - blank meaning no previous visit
					''
				];
			}

			if (!tmpContainer[6]) {
				tmpContainer[6] = uuid.v4();
			}

			return tmpContainer;
		}

		/*
		 * Attaches common web fields to every request
		 * (resolution, url, referrer, etc.)
		 * Also sets the required cookies.
		 */
		function addBrowserData(sb) {
			var nowTs = Math.round(new Date().getTime() / 1000),
				idname = getSnowplowCookieName('id'),
				sesname = getSnowplowCookieName('ses'),
				ses = getSnowplowCookieValue('ses'), // aka cookie.cookie(sesname)
				id = loadDomainUserIdCookie(),
				cookiesDisabled = id[0],
				_domainUserId = id[1], // We could use the global (domainUserId) but this is better etiquette
				createTs = id[2],
				visitCount = id[3],
				currentVisitTs = id[4],
				lastVisitTs = id[5],
				sessionIdFromCookie = id[6];

			if (configDoNotTrack && configUseCookies) {
				cookie.cookie(idname, '', -1, configCookiePath, configCookieDomain);
				cookie.cookie(sesname, '', -1, configCookiePath, configCookieDomain);
				return;
			}

			// If cookies are enabled, base visit count and session ID on the cookies
			if (cookiesDisabled === '0') {
				memorizedSessionId = sessionIdFromCookie;

				// New session?
				if (!ses && configUseCookies) {
					// New session (aka new visit)
					visitCount++;
					// Update the last visit timestamp
					lastVisitTs = currentVisitTs;
					// Regenerate the session ID
					memorizedSessionId = uuid.v4();
				}

				memorizedVisitCount = visitCount;

			// Otherwise, a new session starts if configSessionCookieTimeout seconds have passed since the last event
			} else {
				if ((new Date().getTime() - lastEventTime) > configSessionCookieTimeout * 1000) {
					memorizedSessionId = uuid.v4();
					memorizedVisitCount++;
				}
			}

			// Build out the rest of the request
			sb.add('vp', detectors.detectViewport());
			sb.add('ds', detectors.detectDocumentSize());
			sb.add('vid', memorizedVisitCount);
			sb.add('sid', memorizedSessionId);
			sb.add('duid', _domainUserId); // Set to our local variable
			sb.add('fp', userFingerprint);
			sb.add('uid', businessUserId);

			refreshUrl();

			sb.add('refr', purify(customReferrer || configReferrerUrl));

			// Add the page URL last as it may take us over the IE limit (and we don't always need it)
			sb.add('url', purify(configCustomUrl || locationHrefAlias));

			// Update cookies
			if (configUseCookies) {
				setDomainUserIdCookie(_domainUserId, createTs, memorizedVisitCount, nowTs, lastVisitTs, memorizedSessionId);
				setSessionCookie();
			}

			lastEventTime = new Date().getTime();
		}

		/**
		 * Builds a collector URL from a CloudFront distribution.
		 * We don't bother to support custom CNAMEs because Amazon CloudFront doesn't support that for SSL.
		 *
		 * @param string account The account ID to build the tracker URL from
		 *
		 * @return string The URL on which the collector is hosted
		 */
		function collectorUrlFromCfDist(distSubdomain) {
			return asCollectorUrl(distSubdomain + '.cloudfront.net');
		}

		/**
		 * Adds the protocol in front of our collector URL, and i to the end
		 *
		 * @param string rawUrl The collector URL without protocol
		 *
		 * @return string collectorUrl The tracker URL with protocol
		 */
		function asCollectorUrl(rawUrl) {
			if (forceSecureTracker) {
				return ('https' + '://' + rawUrl);
			} 
			if (forceUnsecureTracker) {
				return ('http' + '://' + rawUrl);
			} 
			return ('https:' === documentAlias.location.protocol ? 'https' : 'http') + '://' + rawUrl;
		}

		/**
		 * Add common contexts to every event
		 * TODO: move this functionality into the core
		 *
		 * @param array userContexts List of user-defined contexts
		 * @return userContexts combined with commonContexts
		 */
		function addCommonContexts(userContexts) {
			var combinedContexts = commonContexts.concat(userContexts || []);

			if (autoContexts.webPage) {
				combinedContexts.push(getWebPageContext());
			}

			// Add PerformanceTiming Context
			if (autoContexts.performanceTiming) {
				var performanceTimingContext = getPerformanceTimingContext();
				if (performanceTimingContext) {
					combinedContexts.push(performanceTimingContext);
				}
			}

			// Add Optimizely Contexts
			if (windowAlias.optimizely) {

				if (autoContexts.optimizelySummary) {
					var activeExperiments = getOptimizelySummaryContexts();
					lodash.each(activeExperiments, function (e) {
						combinedContexts.push(e)
					})
				}

				if (autoContexts.optimizelyExperiments) {
					var experimentContexts = getOptimizelyExperimentContexts();
					for (var i = 0; i < experimentContexts.length; i++) {
						combinedContexts.push(experimentContexts[i]);
					}
				}

				if (autoContexts.optimizelyStates) {
					var stateContexts = getOptimizelyStateContexts();
					for (var i = 0; i < stateContexts.length; i++) {
						combinedContexts.push(stateContexts[i]);
					}
				}

				if (autoContexts.optimizelyVariations) {
					var variationContexts = getOptimizelyVariationContexts();
					for (var i = 0; i < variationContexts.length; i++) {
						combinedContexts.push(variationContexts[i]);
					}
				}

				if (autoContexts.optimizelyVisitor) {
					var optimizelyVisitorContext = getOptimizelyVisitorContext();
					if (optimizelyVisitorContext) {
						combinedContexts.push(optimizelyVisitorContext);
					}
				}

				if (autoContexts.optimizelyAudiences) {
					var audienceContexts = getOptimizelyAudienceContexts();
					for (var i = 0; i < audienceContexts.length; i++) {
						combinedContexts.push(audienceContexts[i]);
					}
				}

				if (autoContexts.optimizelyDimensions) {
					var dimensionContexts = getOptimizelyDimensionContexts();
					for (var i = 0; i < dimensionContexts.length; i++) {
						combinedContexts.push(dimensionContexts[i]);
					}
				}
			}

			// Add Augur Context
			if (autoContexts.augurIdentityLite) {
				var augurIdentityLiteContext = getAugurIdentityLiteContext();
				if (augurIdentityLiteContext) {
					combinedContexts.push(augurIdentityLiteContext);
				}
			}
			
			//Add Parrable Context
			if (autoContexts.parrable){
				var parrableContext = getParrableContext();
				if (parrableContext) {
					combinedContexts.push(parrableContext);
				}
			}
			return combinedContexts;
		}
		

		/**
		 * Initialize new `pageViewId` if it shouldn't be preserved.
		 * Should be called when `trackPageView` is invoked
		 */
		function resetPageView() {
			if (!preservePageViewId || mutSnowplowState.pageViewId == null) {
				mutSnowplowState.pageViewId = uuid.v4();
			}
		}

		/**
		 * Safe function to get `pageViewId`.
		 * Generates it if it wasn't initialized by other tracker
		 */
		function getPageViewId() {
			if (mutSnowplowState.pageViewId == null) {
				mutSnowplowState.pageViewId = uuid.v4();
			}
			return mutSnowplowState.pageViewId
		}

		/**
		 * Put together a web page context with a unique UUID for the page view
		 *
		 * @return object web_page context
		 */
		function getWebPageContext() {
			return {
				schema: 'iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0',
				data: {
					id: getPageViewId()
				}
			};
		}

		/**
		 * Creates a context from the window.performance.timing object
		 *
		 * @return object PerformanceTiming context
		 */
		function getPerformanceTimingContext() {
			var allowedKeys = [
				'navigationStart', 'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd', 'connectStart', 
				'secureConnectionStart', 'connectEnd', 'requestStart', 'responseStart', 'responseEnd', 'unloadEventStart', 'unloadEventEnd',
				'domLoading', 'domInteractive', 'domContentLoadedEventStart', 'domContentLoadedEventEnd', 'domComplete', 'loadEventStart', 
				'loadEventEnd', 'msFirstPaint', 'chromeFirstPaint', 'requestEnd', 'proxyStart', 'proxyEnd'
			];
			var performance = windowAlias.performance || windowAlias.mozPerformance || windowAlias.msPerformance || windowAlias.webkitPerformance;
			if (performance) {

				// On Safari, the fields we are interested in are on the prototype chain of
				// performance.timing so we cannot copy them using lodash.clone
				var performanceTiming = {};
				for (var field in performance.timing) {
					if (helpers.isValueInArray(field, allowedKeys)) {
						performanceTiming[field] = performance.timing[field];
					}
				}

				// Old Chrome versions add an unwanted requestEnd field
				delete performanceTiming.requestEnd;

				// Add the Chrome firstPaintTime to the performance if it exists
				if (windowAlias.chrome && windowAlias.chrome.loadTimes && typeof windowAlias.chrome.loadTimes().firstPaintTime === 'number') {
					performanceTiming.chromeFirstPaint = Math.round(windowAlias.chrome.loadTimes().firstPaintTime * 1000);
				}

				return {
					schema: 'iglu:org.w3/PerformanceTiming/jsonschema/1-0-0',
					data: performanceTiming
				};
			}
		}

		/**
		 * Get data for Optimizely "lite" contexts - active experiments on current page
		 * 
		 * @returns Array content of lite optimizely lite context
		 */
		function getOptimizelySummary() {
			// Prevent throwing exceptions
			var data = windowAlias.optimizely.data;
			var state = data && data.state;
			var experiments = data && data.experiments;

			return lodash.map(state && experiments && state.activeExperiments, function (activeExperiment) {
				var current = experiments[activeExperiment];
				return {
					activeExperimentId: activeExperiment,
					// User can be only in one variation (don't know why is this array)
					variation: state.variationIdsMap[activeExperiment][0],
					conditional: current && current.conditional,
					manual: current && current.manual,
					name: current && current.name
				}
			});
		}

		/**
		 * Creates a context from the window['optimizely'].data.experiments object
		 *
		 * @return Array Experiment contexts
		 */
		function getOptimizelyExperimentContexts() {
			var experiments = windowAlias.optimizely.data.experiments;
			if (experiments) {
				var contexts = [];

				for (var key in experiments) {
					if (experiments.hasOwnProperty(key)) {
						var context = {};
						context.id = key;
						var experiment = experiments[key];
						context.code = experiment.code;
						context.manual = experiment.manual;
						context.conditional = experiment.conditional;
						context.name = experiment.name;
						context.variationIds = experiment.variation_ids;

						contexts.push({
							schema: 'iglu:com.optimizely/experiment/jsonschema/1-0-0',
							data: context
						});
					}
				}
				return contexts;
			}
			return [];
		}

		/**
		 * Creates a context from the window['optimizely'].data.state object
		 *
		 * @return Array State contexts
		 */
		function getOptimizelyStateContexts() {
			var experimentIds = [];
			var experiments = windowAlias.optimizely.data.experiments;
			if (experiments) {
				for (var key in experiments) {
					if (experiments.hasOwnProperty(key)) {
						experimentIds.push(key);
					}
				}
			}

			var state = windowAlias.optimizely.data.state;
			if (state) {
				var contexts = [];
				var activeExperiments = state.activeExperiments || [];

				for (var i = 0; i < experimentIds.length; i++) {
					var experimentId = experimentIds[i];
					var context = {};
					context.experimentId = experimentId;
					context.isActive = helpers.isValueInArray(experimentIds[i], activeExperiments);
					var variationMap = state.variationMap || {};
					context.variationIndex = variationMap[experimentId];
					var variationNamesMap = state.variationNamesMap || {};
					context.variationName = variationNamesMap[experimentId];
					var variationIdsMap = state.variationIdsMap || {};
					if (variationIdsMap[experimentId] && variationIdsMap[experimentId].length === 1) {
						context.variationId = variationIdsMap[experimentId][0];
					}

					contexts.push({
						schema: 'iglu:com.optimizely/state/jsonschema/1-0-0',
						data: context
					});
				}
				return contexts;
			}
			return [];
		}

		/**
		 * Creates a context from the window['optimizely'].data.variations object
		 *
		 * @return Array Variation contexts
		 */
		function getOptimizelyVariationContexts() {
			var variations = windowAlias.optimizely.data.variations;
			if (variations) {
				var contexts = [];

				for (var key in variations) {
					if (variations.hasOwnProperty(key)) {
						var context = {};
						context.id = key;
						var variation = variations[key];
						context.name = variation.name;
						context.code = variation.code;

						contexts.push({
							schema: 'iglu:com.optimizely/variation/jsonschema/1-0-0',
							data: context
						});
					}
				}
				return contexts;
			}
			return [];
		}

		/**
		 * Creates a context from the window['optimizely'].data.visitor object
		 *
		 * @return object Visitor context
		 */
		function getOptimizelyVisitorContext() {
			var visitor = windowAlias.optimizely.data.visitor;
			if (visitor) {
				var context = {};
				context.browser = visitor.browser;
				context.browserVersion = visitor.browserVersion;
				context.device = visitor.device;
				context.deviceType = visitor.deviceType;
				context.ip = visitor.ip;
				var platform = visitor.platform || {};
				context.platformId = platform.id;
				context.platformVersion = platform.version;
				var location = visitor.location || {};
				context.locationCity = location.city;
				context.locationRegion = location.region;
				context.locationCountry = location.country;
				context.mobile = visitor.mobile;
				context.mobileId = visitor.mobileId;
				context.referrer = visitor.referrer;
				context.os = visitor.os;

				return {
					schema: 'iglu:com.optimizely/visitor/jsonschema/1-0-0',
					data: context
				};
			}
		}

		/**
		 * Creates a context from the window['optimizely'].data.visitor.audiences object
		 *
		 * @return Array VisitorAudience contexts
		 */
		function getOptimizelyAudienceContexts() {
			var audienceIds = windowAlias.optimizely.data.visitor.audiences;
			if (audienceIds) {
				var contexts = [];

				for (var key in audienceIds) {
					if (audienceIds.hasOwnProperty(key)) {
                        var context = { id: key, isMember: audienceIds[key] };

						contexts.push({
							schema: 'iglu:com.optimizely/visitor_audience/jsonschema/1-0-0',
							data: context
						});
					}
				}
				return contexts;
			}
			return [];
		}

		/**
		 * Creates a context from the window['optimizely'].data.visitor.dimensions object
		 *
		 * @return Array VisitorDimension contexts
		 */
		function getOptimizelyDimensionContexts() {
			var dimensionIds = windowAlias.optimizely.data.visitor.dimensions;
			if (dimensionIds) {
				var contexts = [];

				for (var key in dimensionIds) {
					if (dimensionIds.hasOwnProperty(key)) {
						var context = { id: key, value: dimensionIds[key] };

						contexts.push({
							schema: 'iglu:com.optimizely/visitor_dimension/jsonschema/1-0-0',
							data: context
						});
					}
				}
				return contexts;
			}
			return [];
		}


		/**
		 * Creates an Optimizely lite context containing only data required to join
		 * event to experiment data
		 *
		 * @returns Array of custom contexts
		 */
		function getOptimizelySummaryContexts() {
			return lodash.map(getOptimizelySummary(), function (experiment) {
				return {
					schema: 'iglu:com.optimizely.snowplow/optimizely_summary/jsonschema/1-0-0',
					data: experiment
				};
			});
		}

		/**
		 * Creates a context from the window['augur'] object
		 *
		 * @return object The IdentityLite context
		 */
		function getAugurIdentityLiteContext() {
			var augur = windowAlias.augur;
			if (augur) {
				var context = { consumer: {}, device: {} };
				var consumer = augur.consumer || {};
				context.consumer.UUID = consumer.UID;
				var device = augur.device || {};
				context.device.ID = device.ID;
				context.device.isBot = device.isBot;
				context.device.isProxied = device.isProxied;
				context.device.isTor = device.isTor;
				var fingerprint = device.fingerprint || {};
				context.device.isIncognito = fingerprint.browserHasIncognitoEnabled;

				return {
					schema: 'iglu:io.augur.snowplow/identity_lite/jsonschema/1-0-0',
					data: context
				};
			}
		}

		/**
		 * Creates a context from the window['_hawk'] object
		 *
		 * @return object The Parrable context
		 */
		function getParrableContext() {
			var parrable = window['_hawk'];
			if (parrable) {
				var context = { encryptedId: null, optout: null};
				context['encryptedId'] =  parrable.browserid;
				var regex = new RegExp('(?:^|;)\\s?' + "_parrable_hawk_optout".replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1') + '=(.*?)(?:;|$)', 'i'), match = document.cookie.match(regex);
				context['optout'] = (match && decodeURIComponent(match[1])) ? match && decodeURIComponent(match[1]) : "false";
				return {
					schema: 'iglu:com.parrable/encrypted_payload/jsonschema/1-0-0',
					data: context
				};
			}
		}
		
		/**
		 * Attempts to create a context using the geolocation API and add it to commonContexts
		 */
		function enableGeolocationContext() {
			if (!geolocationContextAdded && navigatorAlias.geolocation && navigatorAlias.geolocation.getCurrentPosition) {
				geolocationContextAdded = true;
				navigatorAlias.geolocation.getCurrentPosition(function (position) {
					var coords = position.coords;
					var geolocationContext = {
						schema: 'iglu:com.snowplowanalytics.snowplow/geolocation_context/jsonschema/1-1-0',
						data: {
							latitude: coords.latitude,
							longitude: coords.longitude,
							latitudeLongitudeAccuracy: coords.accuracy,
							altitude: coords.altitude,
							altitudeAccuracy: coords.altitudeAccuracy,
							bearing: coords.heading,
							speed: coords.speed,
							timestamp: position.timestamp
						}
					};
					commonContexts.push(geolocationContext);
				});
			}
		}

		/**
		 * Creates a context containing the values of the cookies set by GA
		 *
		 * @return object GA cookies context
		 */
		function getGaCookiesContext() {
			var gaCookieData = {};
			lodash.forEach(['__utma', '__utmb', '__utmc', '__utmv', '__utmz', '_ga'], function (cookieType) {
				var value = cookie.cookie(cookieType);
				if (value) {
					gaCookieData[cookieType] = value;
				}
			});
			return {
				schema: 'iglu:com.google.analytics/cookies/jsonschema/1-0-0',
				data: gaCookieData
			};
		}

		/**
		 * Combine an array of unchanging contexts with the result of a context-creating function
		 *
		 * @param staticContexts Array of custom contexts
		 * @param contextCallback Function returning an array of contexts
		 */
		function finalizeContexts(staticContexts, contextCallback) {
			return (staticContexts || []).concat(contextCallback ? contextCallback() : []);
		}

		/**
		 * Log the page view / visit
		 *
		 * @param customTitle string The user-defined page title to attach to this page view
		 * @param context object Custom context relating to the event
		 * @param contextCallback Function returning an array of contexts
		 * @param tstamp number
		 */
		function logPageView(customTitle, context, contextCallback, tstamp) {

			refreshUrl();
			resetPageView();

			// So we know what document.title was at the time of trackPageView
			lastDocumentTitle = documentAlias.title;
			lastConfigTitle = customTitle;

			// Fixup page title
			var pageTitle = helpers.fixupTitle(lastConfigTitle || lastDocumentTitle);

			// Log page view
			core.trackPageView(
				purify(configCustomUrl || locationHrefAlias),
				pageTitle,
				purify(customReferrer || configReferrerUrl),
				addCommonContexts(finalizeContexts(context, contextCallback)),
				tstamp);
			
			// Send ping (to log that user has stayed on page)
			var now = new Date();
			if (configMinimumVisitTime && configHeartBeatTimer && !activityTrackingInstalled) {
				activityTrackingInstalled = true;

				// Capture our initial scroll points
				resetMaxScrolls();

				// Add event handlers; cross-browser compatibility here varies significantly
				// @see http://quirksmode.org/dom/events
				helpers.addEventListener(documentAlias, 'click', activityHandler);
				helpers.addEventListener(documentAlias, 'mouseup', activityHandler);
				helpers.addEventListener(documentAlias, 'mousedown', activityHandler);
				helpers.addEventListener(documentAlias, 'mousemove', activityHandler);
				helpers.addEventListener(documentAlias, 'mousewheel', activityHandler);
				helpers.addEventListener(windowAlias, 'DOMMouseScroll', activityHandler);
				helpers.addEventListener(windowAlias, 'scroll', scrollHandler); // Will updateMaxScrolls() for us
				helpers.addEventListener(documentAlias, 'keypress', activityHandler);
				helpers.addEventListener(documentAlias, 'keydown', activityHandler);
				helpers.addEventListener(documentAlias, 'keyup', activityHandler);
				helpers.addEventListener(windowAlias, 'resize', activityHandler);
				helpers.addEventListener(windowAlias, 'focus', activityHandler);
				helpers.addEventListener(windowAlias, 'blur', activityHandler);

				// Periodic check for activity.
				lastActivityTime = now.getTime();
				setInterval(function heartBeat() {
					var now = new Date();

					// There was activity during the heart beat period;
					// on average, this is going to overstate the visitDuration by configHeartBeatTimer/2
					if ((lastActivityTime + configHeartBeatTimer) > now.getTime()) {
						// Send ping if minimum visit time has elapsed
						if (configMinimumVisitTime < now.getTime()) {
							logPagePing(finalizeContexts(context, contextCallback)); // Grab the min/max globals
						}
					}
				}, configHeartBeatTimer);
			}
		}

		/**
		 * Log that a user is still viewing a given page
		 * by sending a page ping.
		 * Not part of the public API - only called from
		 * logPageView() above.
		 *
		 * @param context object Custom context relating to the event
		 */
		function logPagePing(context) {
			refreshUrl();
			newDocumentTitle = documentAlias.title;
			if (newDocumentTitle !== lastDocumentTitle) {
				lastDocumentTitle = newDocumentTitle;
				lastConfigTitle = null;
			}
			core.trackPagePing(
				purify(configCustomUrl || locationHrefAlias),
				helpers.fixupTitle(lastConfigTitle || lastDocumentTitle),
				purify(customReferrer || configReferrerUrl),
				cleanOffset(minXOffset),
				cleanOffset(maxXOffset),
				cleanOffset(minYOffset),
				cleanOffset(maxYOffset),
				addCommonContexts(context));
			resetMaxScrolls();
		}

		/**
		 * Log ecommerce transaction metadata
		 *
		 * @param string orderId
		 * @param string affiliation
		 * @param string total
		 * @param string tax
		 * @param string shipping
		 * @param string city
		 * @param string state
		 * @param string country
		 * @param string currency The currency the total/tax/shipping are expressed in
		 * @param object context Custom context relating to the event
		 * @param tstamp number or Timestamp object
		 */
		function logTransaction(orderId, affiliation, total, tax, shipping, city, state, country, currency, context, tstamp) {
			core.trackEcommerceTransaction(orderId, affiliation, total, tax, shipping, city, state, country, currency, addCommonContexts(context), tstamp);
		}

		/**
		 * Log ecommerce transaction item
		 *
		 * @param string orderId
		 * @param string sku
		 * @param string name
		 * @param string category
		 * @param string price
		 * @param string quantity
		 * @param string currency The currency the price is expressed in
		 * @param object context Custom context relating to the event
		 */
		function logTransactionItem(orderId, sku, name, category, price, quantity, currency, context, tstamp) {
			core.trackEcommerceTransactionItem(orderId, sku, name, category, price, quantity, currency, addCommonContexts(context), tstamp);
		}

		/**
		 * Construct a browser prefix
		 *
		 * E.g: (moz, hidden) -> mozHidden
		 */
		function prefixPropertyName(prefix, propertyName) {

			if (prefix !== '') {
				return prefix + propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
			}

			return propertyName;
		}

		/**
		 * Check for pre-rendered web pages, and log the page view/link
		 * according to the configuration and/or visibility
		 *
		 * @see http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/PageVisibility/Overview.html
		 */
		function trackCallback(callback) {
			var isPreRendered,
				i,
				// Chrome 13, IE10, FF10
				prefixes = ['', 'webkit', 'ms', 'moz'],
				prefix;

			if (!configCountPreRendered) {

				for (i = 0; i < prefixes.length; i++) {
					prefix = prefixes[i];

					// does this browser support the page visibility API? (drop this check along with IE9 and iOS6)
					if (documentAlias[prefixPropertyName(prefix, 'hidden')]) {
						// if pre-rendered, then defer callback until page visibility changes
						if (documentAlias[prefixPropertyName(prefix, 'visibilityState')] === 'prerender') {
							isPreRendered = true;
						}
						break;
					} else if (documentAlias[prefixPropertyName(prefix, 'hidden')] === false) { break }
				}
			}

			if (isPreRendered) {
				// note: the event name doesn't follow the same naming convention as vendor properties
				helpers.addEventListener(documentAlias, prefix + 'visibilitychange', function ready() {
					documentAlias.removeEventListener(prefix + 'visibilitychange', ready, false);
					callback();
				});
				return;
			}

			// configCountPreRendered === true || isPreRendered === false
			callback();
		}


		/************************************************************
		 * Constructor
		 ************************************************************/

		/*
		 * Initialize tracker
		 */
		updateDomainHash();

		initializeIdsAndCookies();

		if (argmap.crossDomainLinker) {
			decorateLinks(argmap.crossDomainLinker);
		}

		/************************************************************
		 * Public data and methods
		 ************************************************************/

		return {

			/**
			 * Get the current user ID (as set previously
			 * with setUserId()).
			 *
			 * @return string Business-defined user ID
			 */
			getUserId: function () {
				return businessUserId;
			},

			/**
			 * Get visitor ID (from first party cookie)
			 *
			 * @return string Visitor ID in hexits (or null, if not yet known)
			 */
			getDomainUserId: function () {
				return (loadDomainUserIdCookie())[1];
			},

			/**
			 * Get the visitor information (from first party cookie)
			 *
			 * @return array
			 */
			getDomainUserInfo: function () {
				return loadDomainUserIdCookie();
			},

			/**
			 * Get the user fingerprint
			 *
			 * @return string The user fingerprint
			 */
			getUserFingerprint: function () {
				return userFingerprint;
			},

			/**
			* Specify the app ID
			*
			* @param int|string appId
			*/
			setAppId: function (appId) {
				helpers.warn('setAppId is deprecated. Instead add an "appId" field to the argmap argument of newTracker.');
				core.setAppId(appId);
			},

			/**
			 * Override referrer
			 *
			 * @param string url
			 */
			setReferrerUrl: function (url) {
				customReferrer = url;
			},

			/**
			 * Override url
			 *
			 * @param string url
			 */
			setCustomUrl: function (url) {
				refreshUrl();
				configCustomUrl = resolveRelativeReference(locationHrefAlias, url);
			},

			/**
			 * Override document.title
			 *
			 * @param string title
			 */
			setDocumentTitle: function (title) {
				// So we know what document.title was at the time of trackPageView
				lastDocumentTitle = documentAlias.title;
				lastConfigTitle = title;
			},

			/**
			 * Strip hash tag (or anchor) from URL
			 *
			 * @param bool enableFilter
			 */
			discardHashTag: function (enableFilter) {
				configDiscardHashTag = enableFilter;
			},

			/**
			 * Set first-party cookie name prefix
			 *
			 * @param string cookieNamePrefix
			 */
			setCookieNamePrefix: function (cookieNamePrefix) {
				helpers.warn('setCookieNamePrefix is deprecated. Instead add a "cookieName" field to the argmap argument of newTracker.');
				configCookieNamePrefix = cookieNamePrefix;
			},

			/**
			 * Set first-party cookie domain
			 *
			 * @param string domain
			 */
			setCookieDomain: function (domain) {
				helpers.warn('setCookieDomain is deprecated. Instead add a "cookieDomain" field to the argmap argument of newTracker.');
				configCookieDomain = helpers.fixupDomain(domain);
				updateDomainHash();
			},

			/**
			 * Set first-party cookie path
			 *
			 * @param string domain
			 */
			setCookiePath: function (path) {
				configCookiePath = path;
				updateDomainHash();
			},

			/**
			 * Set visitor cookie timeout (in seconds)
			 *
			 * @param int timeout
			 */
			setVisitorCookieTimeout: function (timeout) {
				configVisitorCookieTimeout = timeout;
			},

			/**
			 * Set session cookie timeout (in seconds)
			 *
			 * @param int timeout
			 */
			setSessionCookieTimeout: function (timeout) {
				helpers.warn('setSessionCookieTimeout is deprecated. Instead add a "sessionCookieTimeout" field to the argmap argument of newTracker.')
				configSessionCookieTimeout = timeout;
			},

			/**
			* @param number seed The seed used for MurmurHash3
			*/
			setUserFingerprintSeed: function(seed) {
				helpers.warn('setUserFingerprintSeed is deprecated. Instead add a "userFingerprintSeed" field to the argmap argument of newTracker.');
				configUserFingerprintHashSeed = seed;
				userFingerprint = detectors.detectSignature(configUserFingerprintHashSeed);
			},

			/**
			* Enable/disable user fingerprinting. User fingerprinting is enabled by default.
			* @param bool enable If false, turn off user fingerprinting
			*/
			enableUserFingerprint: function(enable) {
			helpers.warn('enableUserFingerprintSeed is deprecated. Instead add a "userFingerprint" field to the argmap argument of newTracker.');
				if (!enable) {
					userFingerprint = '';
				}
			},

			/**
			 * Prevent tracking if user's browser has Do Not Track feature enabled,
			 * where tracking is:
			 * 1) Sending events to a collector
			 * 2) Setting first-party cookies
			 * @param bool enable If true and Do Not Track feature enabled, don't track.
			 */
			respectDoNotTrack: function (enable) {
				helpers.warn('This usage of respectDoNotTrack is deprecated. Instead add a "respectDoNotTrack" field to the argmap argument of newTracker.');
				var dnt = navigatorAlias.doNotTrack || navigatorAlias.msDoNotTrack;

				configDoNotTrack = enable && (dnt === 'yes' || dnt === '1');
			},

			/**
			 * Enable querystring decoration for links pasing a filter
			 *
			 * @param function crossDomainLinker Function used to determine which links to decorate
			 */
			crossDomainLinker: function (crossDomainLinkerCriterion) {
				decorateLinks(crossDomainLinkerCriterion);
			},

			/**
			 * Add click listener to a specific link element.
			 * When clicked, Piwik will log the click automatically.
			 *
			 * @param DOMElement element
			 * @param bool enable If true, use pseudo click-handler (mousedown+mouseup)
			 */
			addListener: function (element, pseudoClicks, context) {
				addClickListener(element, pseudoClicks, context);
			},

			/**
			 * Install link tracker
			 *
			 * The default behaviour is to use actual click events. However, some browsers
			 * (e.g., Firefox, Opera, and Konqueror) don't generate click events for the middle mouse button.
			 *
			 * To capture more "clicks", the pseudo click-handler uses mousedown + mouseup events.
			 * This is not industry standard and is vulnerable to false positives (e.g., drag events).
			 *
			 * There is a Safari/Chrome/Webkit bug that prevents tracking requests from being sent
			 * by either click handler.  The workaround is to set a target attribute (which can't
			 * be "_self", "_top", or "_parent").
			 *
			 * @see https://bugs.webkit.org/show_bug.cgi?id=54783
			 *
			 * @param object criterion Criterion by which it will be decided whether a link will be tracked
			 * @param bool pseudoClicks If true, use pseudo click-handler (mousedown+mouseup)
			 * @param bool trackContent Whether to track the innerHTML of the link element
			 * @param array context Context for all link click events
			 */
			enableLinkClickTracking: function (criterion, pseudoClicks, trackContent, context) {
				if (mutSnowplowState.hasLoaded) {
					// the load event has already fired, add the click listeners now
					linkTrackingManager.configureLinkClickTracking(criterion, pseudoClicks, trackContent, context);
					linkTrackingManager.addClickListeners();
				} else {
					// defer until page has loaded
					mutSnowplowState.registeredOnLoadHandlers.push(function () {
						linkTrackingManager.configureLinkClickTracking(criterion, pseudoClicks, trackContent, context);
						linkTrackingManager.addClickListeners();
					});
				}
			},

			/**
			 * Add click event listeners to links which have been added to the page since the
			 * last time enableLinkClickTracking or refreshLinkClickTracking was used
			 */
			refreshLinkClickTracking: function () {
				if (mutSnowplowState.hasLoaded) {
					linkTrackingManager.addClickListeners();
				} else {
					mutSnowplowState.registeredOnLoadHandlers.push(function () {
						linkTrackingManager.addClickListeners();
					});
				}
			},

			/**
			 * Enables page activity tracking (sends page
			 * pings to the Collector regularly).
			 *
			 * @param int minimumVisitLength Seconds to wait before sending first page ping
			 * @param int heartBeatDelay Seconds to wait between pings
			 */
			enableActivityTracking: function (minimumVisitLength, heartBeatDelay) {
				configMinimumVisitTime = new Date().getTime() + minimumVisitLength * 1000;
				configHeartBeatTimer = heartBeatDelay * 1000;
			},

			/**
			 * Enables automatic form tracking.
			 * An event will be fired when a form field is changed or a form submitted.
			 * This can be called multiple times: only forms not already tracked will be tracked.
			 *
			 * @param object config Configuration object determining which forms and fields to track.
			 *                      Has two properties: "forms" and "fields"
			 * @param array context Context for all form tracking events
			 */
			enableFormTracking: function (config, context) {
				if (mutSnowplowState.hasLoaded) {
					formTrackingManager.configureFormTracking(config);
					formTrackingManager.addFormListeners(context);
				} else {
					mutSnowplowState.registeredOnLoadHandlers.push(function () {
						formTrackingManager.configureFormTracking(config);
						formTrackingManager.addFormListeners(context);
					});
				}
			},

			/**
			 * Frame buster
			 */
			killFrame: function () {
				if (windowAlias.location !== windowAlias.top.location) {
					windowAlias.top.location = windowAlias.location;
				}
			},

			/**
			 * Redirect if browsing offline (aka file: buster)
			 *
			 * @param string url Redirect to this URL
			 */
			redirectFile: function (url) {
				if (windowAlias.location.protocol === 'file:') {
					windowAlias.location = url;
				}
			},

			/**
			 * Count sites in pre-rendered state
			 *
			 * @param bool enable If true, track when in pre-rendered state
			 */
			setCountPreRendered: function (enable) {
				configCountPreRendered = enable;
			},

			/**
			 * Set the business-defined user ID for this user.
			 *
			 * @param string userId The business-defined user ID
			 */
			setUserId: function(userId) {
				businessUserId = userId;
			},

			/**
			 * Set the business-defined user ID for this user using the location querystring.
			 *
			 * @param string queryName Name of a querystring name-value pair
			 */
			setUserIdFromLocation: function(querystringField) {
				refreshUrl();
				businessUserId = helpers.fromQuerystring(querystringField, locationHrefAlias);
			},

			/**
			 * Set the business-defined user ID for this user using the referrer querystring.
			 *
			 * @param string queryName Name of a querystring name-value pair
			 */
			setUserIdFromReferrer: function(querystringField) {
				refreshUrl();
				businessUserId = helpers.fromQuerystring(querystringField, configReferrerUrl);
			},

			/**
			 * Set the business-defined user ID for this user to the value of a cookie.
			 *
			 * @param string cookieName Name of the cookie whose value will be assigned to businessUserId
			 */
			setUserIdFromCookie: function(cookieName) {
				businessUserId = cookie.cookie(cookieName);
			},

			/**
			 * Configure this tracker to log to a CloudFront collector.
			 *
			 * @param string distSubdomain The subdomain on your CloudFront collector's distribution
			 */
			setCollectorCf: function (distSubdomain) {
				configCollectorUrl = collectorUrlFromCfDist(distSubdomain);
			},

			/**
			 *
			 * Specify the Snowplow collector URL. No need to include HTTP
			 * or HTTPS - we will add this.
			 *
			 * @param string rawUrl The collector URL minus protocol and /i
			 */
			setCollectorUrl: function (rawUrl) {
				configCollectorUrl = asCollectorUrl(rawUrl);
			},

			/**
			* Specify the platform
			*
			* @param string platform Overrides the default tracking platform
			*/
			setPlatform: function(platform) {
				helpers.warn('setPlatform is deprecated. Instead add a "platform" field to the argmap argument of newTracker.');
				core.setPlatform(platform);
			},

			/**
			*
			* Enable Base64 encoding for self-describing event payload
			*
			* @param bool enabled A boolean value indicating if the Base64 encoding for self-describing events should be enabled or not
			*/
			encodeBase64: function (enabled) {
				helpers.warn('This usage of encodeBase64 is deprecated. Instead add an "encodeBase64" field to the argmap argument of newTracker.');
				core.setBase64Encoding(enabled);
			},

			/**
			 * Send all events in the outQueue
			 * Use only when sending POSTs with a bufferSize of at least 2
			 */
			flushBuffer: function () {
				outQueueManager.executeQueue();
			},

			/**
			 * Add the geolocation context to all events
			 */
			enableGeolocationContext: enableGeolocationContext,

			/**
			 * Log visit to this page
			 *
			 * @param string customTitle
			 * @param object Custom context relating to the event
			 * @param object contextCallback Function returning an array of contexts
			 * @param tstamp number or Timestamp object
			 */
			trackPageView: function (customTitle, context, contextCallback, tstamp) {
				trackCallback(function () {
					logPageView(customTitle, context, contextCallback, tstamp);
				});
			},

			/**
			 * Track a structured event happening on this page.
			 *
			 * Replaces trackEvent, making clear that the type
			 * of event being tracked is a structured one.
			 *
			 * @param string category The name you supply for the group of objects you want to track
			 * @param string action A string that is uniquely paired with each category, and commonly used to define the type of user interaction for the web object
			 * @param string label (optional) An optional string to provide additional dimensions to the event data
			 * @param string property (optional) Describes the object or the action performed on it, e.g. quantity of item added to basket
			 * @param int|float|string value (optional) An integer that you can use to provide numerical data about the user event
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackStructEvent: function (category, action, label, property, value, context, tstamp) {
				core.trackStructEvent(category, action, label, property, value, addCommonContexts(context), tstamp);
			},

			/**
			 * Track a self-describing event (previously unstructured event) happening on this page.
			 *
			 * @param object eventJson Contains the properties and schema location for the event
			 * @param object context Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackSelfDescribingEvent: function (eventJson, context, tstamp) {
				core.trackSelfDescribingEvent(eventJson, addCommonContexts(context), tstamp);
			},

			/**
			 * Alias for `trackSelfDescribingEvent`, left for compatibility
			 */
			trackUnstructEvent: function (eventJson, context, tstamp) {
				core.trackSelfDescribingEvent(eventJson, addCommonContexts(context), tstamp);
			},

			/**
			 * Track an ecommerce transaction
			 *
			 * @param string orderId Required. Internal unique order id number for this transaction.
			 * @param string affiliation Optional. Partner or store affiliation.
			 * @param string total Required. Total amount of the transaction.
			 * @param string tax Optional. Tax amount of the transaction.
			 * @param string shipping Optional. Shipping charge for the transaction.
			 * @param string city Optional. City to associate with transaction.
			 * @param string state Optional. State to associate with transaction.
			 * @param string country Optional. Country to associate with transaction.
			 * @param string currency Optional. Currency to associate with this transaction.
			 * @param object context Optional. Context relating to the event.
			 * @param tstamp number or Timestamp object
			 */
			addTrans: function(orderId, affiliation, total, tax, shipping, city, state, country, currency, context, tstamp) {
				ecommerceTransaction.transaction = {
					orderId: orderId,
					affiliation: affiliation,
					total: total,
					tax: tax,
					shipping: shipping,
					city: city,
					state: state,
					country: country,
					currency: currency,
					context: context,
					tstamp: tstamp
				};
			},

			/**
			 * Track an ecommerce transaction item
			 *
			 * @param string orderId Required Order ID of the transaction to associate with item.
			 * @param string sku Required. Item's SKU code.
			 * @param string name Optional. Product name.
			 * @param string category Optional. Product category.
			 * @param string price Required. Product price.
			 * @param string quantity Required. Purchase quantity.
			 * @param string currency Optional. Product price currency.
			 * @param object context Optional. Context relating to the event.
			 * @param tstamp number or Timestamp object
			 */
			addItem: function(orderId, sku, name, category, price, quantity, currency, context, tstamp) {
				ecommerceTransaction.items.push({
					orderId: orderId,
					sku: sku,
					name: name,
					category: category,
					price: price,
					quantity: quantity,
					currency: currency,
					context: context,
					tstamp: tstamp
				});
			},

			/**
			 * Commit the ecommerce transaction
			 *
			 * This call will send the data specified with addTrans,
			 * addItem methods to the tracking server.
			 */
			trackTrans: function() {
				logTransaction(
					ecommerceTransaction.transaction.orderId,
					ecommerceTransaction.transaction.affiliation,
					ecommerceTransaction.transaction.total,
					ecommerceTransaction.transaction.tax,
					ecommerceTransaction.transaction.shipping,
					ecommerceTransaction.transaction.city,
					ecommerceTransaction.transaction.state,
					ecommerceTransaction.transaction.country,
					ecommerceTransaction.transaction.currency,
					ecommerceTransaction.transaction.context,
					ecommerceTransaction.transaction.tstamp

				);
				for (var i = 0; i < ecommerceTransaction.items.length; i++) {
					var item = ecommerceTransaction.items[i];
					logTransactionItem(
						item.orderId,
						item.sku,
						item.name,
						item.category,
						item.price,
						item.quantity,
						item.currency,
						item.context,
						item.tstamp
					);
				}

				ecommerceTransaction = ecommerceTransactionTemplate();
			},

			/**
			 * Manually log a click from your own code
			 *
			 * @param string elementId
			 * @param array elementClasses
			 * @param string elementTarget
			 * @param string targetUrl
			 * @param string elementContent innerHTML of the element
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			// TODO: break this into trackLink(destUrl) and trackDownload(destUrl)
			trackLinkClick: function(targetUrl, elementId, elementClasses, elementTarget, elementContent, context, tstamp) {
				trackCallback(function () {
					core.trackLinkClick(targetUrl, elementId, elementClasses, elementTarget, elementContent, addCommonContexts(context), tstamp);
				});
			},

			/**
			 * Track an ad being served
			 *
			 * @param string impressionId Identifier for a particular ad impression
			 * @param string costModel The cost model. 'cpa', 'cpc', or 'cpm'
			 * @param number cost Cost
			 * @param string bannerId Identifier for the ad banner displayed
			 * @param string zoneId Identifier for the ad zone
			 * @param string advertiserId Identifier for the advertiser
			 * @param string campaignId Identifier for the campaign which the banner belongs to
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackAdImpression: function(impressionId, costModel, cost, targetUrl, bannerId, zoneId, advertiserId, campaignId, context, tstamp) {
				trackCallback(function () {
					core.trackAdImpression(impressionId, costModel, cost, targetUrl, bannerId, zoneId, advertiserId, campaignId, addCommonContexts(context), tstamp);
				});
			},

			/**
			 * Track an ad being clicked
			 *
			 * @param string clickId Identifier for the ad click
			 * @param string costModel The cost model. 'cpa', 'cpc', or 'cpm'
			 * @param number cost Cost
			 * @param string targetUrl (required) The link's target URL
			 * @param string bannerId Identifier for the ad banner displayed
			 * @param string zoneId Identifier for the ad zone
			 * @param string impressionId Identifier for a particular ad impression
			 * @param string advertiserId Identifier for the advertiser
			 * @param string campaignId Identifier for the campaign which the banner belongs to
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackAdClick: function(targetUrl, clickId, costModel, cost, bannerId, zoneId, impressionId, advertiserId, campaignId, context, tstamp) {
				core.trackAdClick(targetUrl, clickId, costModel, cost, bannerId, zoneId, impressionId, advertiserId, campaignId, addCommonContexts(context), tstamp);
			},

			/**
			 * Track an ad conversion event
			 *
			 * @param string conversionId Identifier for the ad conversion event
			 * @param number cost Cost
			 * @param string category The name you supply for the group of objects you want to track
			 * @param string action A string that is uniquely paired with each category
			 * @param string property Describes the object of the conversion or the action performed on it
			 * @param number initialValue Revenue attributable to the conversion at time of conversion
			 * @param string advertiserId Identifier for the advertiser
			 * @param string costModel The cost model. 'cpa', 'cpc', or 'cpm'
			 * @param string campaignId Identifier for the campaign which the banner belongs to
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackAdConversion: function(conversionId, costModel, cost, category, action, property, initialValue, advertiserId, campaignId, context, tstamp) {
				core.trackAdConversion(conversionId, costModel, cost, category, action, property, initialValue, advertiserId, campaignId, addCommonContexts(context), tstamp);
			},

			/**
			 * Track a social interaction event
			 *
			 * @param string action (required) Social action performed
			 * @param string network (required) Social network
			 * @param string target Object of the social action e.g. the video liked, the tweet retweeted
			 * @param object Custom context relating to the event
			 * @param tstamp number or Timestamp object
			 */
			trackSocialInteraction: function(action, network, target, context, tstamp) {
				core.trackSocialInteraction(action, network, target, addCommonContexts(context), tstamp);
			},

			/**
			 * Track an add-to-cart event
			 *
			 * @param string sku Required. Item's SKU code.
			 * @param string name Optional. Product name.
			 * @param string category Optional. Product category.
			 * @param string unitPrice Optional. Product price.
			 * @param string quantity Required. Quantity added.
			 * @param string currency Optional. Product price currency.
			 * @param array context Optional. Context relating to the event.
			 * @param tstamp number or Timestamp object
			 */
			trackAddToCart: function(sku, name, category, unitPrice, quantity, currency, context, tstamp) {
				core.trackAddToCart(sku, name, category, unitPrice, quantity, currency, addCommonContexts(context), tstamp);
			},

			/**
			 * Track a remove-from-cart event
			 *
			 * @param string sku Required. Item's SKU code.
			 * @param string name Optional. Product name.
			 * @param string category Optional. Product category.
			 * @param string unitPrice Optional. Product price.
			 * @param string quantity Required. Quantity removed.
			 * @param string currency Optional. Product price currency.
			 * @param array context Optional. Context relating to the event.
			 * @param tstamp Opinal number or Timestamp object
			 */
			trackRemoveFromCart: function(sku, name, category, unitPrice, quantity, currency, context, tstamp) {
				core.trackRemoveFromCart(sku, name, category, unitPrice, quantity, currency, addCommonContexts(context), tstamp);
			},

			/**
			 * Track an internal search event
			 *
			 * @param array terms Search terms
			 * @param object filters Search filters
			 * @param number totalResults Number of results
			 * @param number pageResults Number of results displayed on page
			 * @param array context Optional. Context relating to the event.
			 * @param tstamp Opinal number or Timestamp object
			 */
			trackSiteSearch: function(terms, filters, totalResults, pageResults, context, tstamp) {
				core.trackSiteSearch(terms, filters, totalResults, pageResults, addCommonContexts(context), tstamp);
			},

			/**
			 * Track a timing event (such as the time taken for a resource to load)
			 *
			 * @param string category Required.
			 * @param string variable Required.
			 * @param number timing Required.
			 * @param string label Optional.
			 * @param array context Optional. Context relating to the event.
			 * @param tstamp Opinal number or Timestamp object
			 */
			trackTiming: function (category, variable, timing, label, context, tstamp) {
				core.trackSelfDescribingEvent({
					schema: 'iglu:com.snowplowanalytics.snowplow/timing/jsonschema/1-0-0',
					data: {
						category: category,
						variable: variable,
						timing: timing,
						label: label
					}
				}, addCommonContexts(context), tstamp)
			},

			/**
			 * Track a GA Enhanced Ecommerce Action with all stored
			 * Enhanced Ecommerce contexts
			 *
			 * @param string action
			 * @param array context Optional. Context relating to the event.
			 * @param tstamp Opinal number or Timestamp object
			 */
			trackEnhancedEcommerceAction: function (action, context, tstamp) {
				var combinedEnhancedEcommerceContexts = enhancedEcommerceContexts.concat(context || []);
				enhancedEcommerceContexts.length = 0;

				core.trackSelfDescribingEvent({
					schema: 'iglu:com.google.analytics.enhanced-ecommerce/action/jsonschema/1-0-0',
					data: {
						action: action
					}
				}, addCommonContexts(combinedEnhancedEcommerceContexts), tstamp);
			},

			/**
			 * Adds a GA Enhanced Ecommerce Action Context
			 *
			 * @param string id
			 * @param string affiliation
			 * @param number revenue
			 * @param number tax
			 * @param number shipping
			 * @param string coupon
			 * @param string list
			 * @param integer step
			 * @param string option
			 * @param string currency
			 */
			addEnhancedEcommerceActionContext: function (id, affiliation, revenue, tax, shipping, coupon, list, step, option, currency) {
				enhancedEcommerceContexts.push({
					schema: 'iglu:com.google.analytics.enhanced-ecommerce/actionFieldObject/jsonschema/1-0-0',
					data: {
						id: id,
						affiliation: affiliation,
						revenue: helpers.parseFloat(revenue),
						tax: helpers.parseFloat(tax),
						shipping: helpers.parseFloat(shipping),
						coupon: coupon,
						list: list,
						step: helpers.parseInt(step),
						option: option,
						currency: currency
					}
				});
			},

			/**
			 * Adds a GA Enhanced Ecommerce Impression Context
			 *
			 * @param string id
			 * @param string name
			 * @param string list
			 * @param string brand
			 * @param string category
			 * @param string variant
			 * @param integer position
			 * @param number price
			 * @param string currency
			 */
			addEnhancedEcommerceImpressionContext: function (id, name, list, brand, category, variant, position, price, currency) {
				enhancedEcommerceContexts.push({
					schema: 'iglu:com.google.analytics.enhanced-ecommerce/impressionFieldObject/jsonschema/1-0-0',
					data: {
						id: id,
						name: name,
						list: list,
						brand: brand,
						category: category,
						variant: variant,
						position: helpers.parseInt(position),
						price: helpers.parseFloat(price),
						currency: currency
					}
				});
			},

			/**
			 * Adds a GA Enhanced Ecommerce Product Context
			 *
			 * @param string id
			 * @param string name
			 * @param string list
			 * @param string brand
			 * @param string category
			 * @param string variant
			 * @param number price
			 * @param integer quantity
			 * @param string coupon
			 * @param integer position
			 * @param string currency
			 */
			addEnhancedEcommerceProductContext: function (id, name, list, brand, category, variant, price, quantity, coupon, position, currency) {
				enhancedEcommerceContexts.push({
					schema: 'iglu:com.google.analytics.enhanced-ecommerce/productFieldObject/jsonschema/1-0-0',
					data: {
						id: id,
						name: name,
						list: list,
						brand: brand,
						category: category,
						variant: variant,
						price: helpers.parseFloat(price),
						quantity: helpers.parseInt(quantity),
						coupon: coupon,
						position: helpers.parseInt(position),
						currency: currency
					}
				});
			},

			/**
			 * Adds a GA Enhanced Ecommerce Promo Context
			 *
			 * @param string id
			 * @param string name
			 * @param string creative
			 * @param string position
			 * @param string currency
			 */
			addEnhancedEcommercePromoContext: function (id, name, creative, position, currency) {
				enhancedEcommerceContexts.push({
					schema: 'iglu:com.google.analytics.enhanced-ecommerce/promoFieldObject/jsonschema/1-0-0',
					data: {
						id: id,
						name: name,
						creative: creative,
						position: position,
						currency: currency
					}
				});
			},

			/**
			 * Enable tracking of unhandled exceptions with custom contexts
			 *
			 * @param filter Function ErrorEvent => Bool to check whether error should be tracker
			 * @param contextsAdder Function ErrorEvent => Array<Context> to add custom contexts with
			 *                     internal state based on particular error
			 */
			enableErrorTracking: function (filter, contextsAdder) {
				errorManager.enableErrorTracking(filter, contextsAdder, addCommonContexts())
			},

			/**
			 * Track unhandled exception.
			 * This method supposed to be used inside try/catch block
			 *
			 * @param message string Message appeared in console
			 * @param filename string Source file (not used)
			 * @param lineno number Line number
			 * @param colno number Column number (not used)
			 * @param error Error error object (not present in all browsers)
			 * @param contexts Array of custom contexts
			 */
			trackError: function (message, filename, lineno, colno, error, contexts) {
				var enrichedContexts = addCommonContexts(contexts);
			    errorManager.trackError(message, filename, lineno, colno, error, enrichedContexts);
			},

			/**
			 * Stop regenerating `pageViewId` (available from `web_page` context)
			 */
			preservePageViewId: function () {
				preservePageViewId = true
			}
		};
	};

}());

},{"./errors":5,"./forms":6,"./lib/detectors":9,"./lib/helpers":10,"./lib/proxies":11,"./lib_managed/lodash":12,"./links":13,"./out_queue":14,"browser-cookie-lite":17,"sha1":22,"snowplow-tracker-core":23,"uuid":29}],17:[function(require,module,exports){



/*
* @version    1.0.4
* @date       2015-03-13
* @stability  3 - Stable
* @author     Lauri Rooden <lauri@rooden.ee>
* @license    MIT License
*/


// In browser `this` refers to the window object,
// in NodeJS `this` refers to the exports.

this.cookie = function(name, value, ttl, path, domain, secure) {

	if (arguments.length > 1) {
		return document.cookie = name + "=" + encodeURIComponent(value) +
			(ttl ? "; expires=" + new Date(+new Date()+(ttl*1000)).toUTCString() : "") +
			(path   ? "; path=" + path : "") +
			(domain ? "; domain=" + domain : "") +
			(secure ? "; secure" : "")
	}

	return decodeURIComponent((("; "+document.cookie).split("; "+name+"=")[1]||"").split(";")[0])
}

},{}],18:[function(require,module,exports){
(function (root) {/*global exports, Intl*/
/**
 * This script gives you the zone info key representing your device's time zone setting.
 *
 * @name jsTimezoneDetect
 * @version 1.0.6
 * @author Jon Nylander
 * @license MIT License - https://bitbucket.org/pellepim/jstimezonedetect/src/default/LICENCE.txt
 *
 * For usage and examples, visit:
 * http://pellepim.bitbucket.org/jstz/
 *
 * Copyright (c) Jon Nylander
 */


/**
 * Namespace to hold all the code for timezone detection.
 */
var jstz = (function () {
    'use strict';
    var HEMISPHERE_SOUTH = 's',

        consts = {
            DAY: 86400000,
            HOUR: 3600000,
            MINUTE: 60000,
            SECOND: 1000,
            BASELINE_YEAR: 2014,
            MAX_SCORE: 864000000, // 10 days
            AMBIGUITIES: {
                'America/Denver':       ['America/Mazatlan'],
                'Europe/London':        ['Africa/Casablanca'],
                'America/Chicago':      ['America/Mexico_City'],
                'America/Asuncion':     ['America/Campo_Grande', 'America/Santiago'],
                'America/Montevideo':   ['America/Sao_Paulo', 'America/Santiago'],
                // Europe/Minsk should not be in this list... but Windows.
                'Asia/Beirut':          ['Asia/Amman', 'Asia/Jerusalem', 'Europe/Helsinki', 'Asia/Damascus', 'Africa/Cairo', 'Asia/Gaza', 'Europe/Minsk'],
                'Pacific/Auckland':     ['Pacific/Fiji'],
                'America/Los_Angeles':  ['America/Santa_Isabel'],
                'America/New_York':     ['America/Havana'],
                'America/Halifax':      ['America/Goose_Bay'],
                'America/Godthab':      ['America/Miquelon'],
                'Asia/Dubai':           ['Asia/Yerevan'],
                'Asia/Jakarta':         ['Asia/Krasnoyarsk'],
                'Asia/Shanghai':        ['Asia/Irkutsk', 'Australia/Perth'],
                'Australia/Sydney':     ['Australia/Lord_Howe'],
                'Asia/Tokyo':           ['Asia/Yakutsk'],
                'Asia/Dhaka':           ['Asia/Omsk'],
                // In the real world Yerevan is not ambigous for Baku... but Windows.
                'Asia/Baku':            ['Asia/Yerevan'],
                'Australia/Brisbane':   ['Asia/Vladivostok'],
                'Pacific/Noumea':       ['Asia/Vladivostok'],
                'Pacific/Majuro':       ['Asia/Kamchatka', 'Pacific/Fiji'],
                'Pacific/Tongatapu':    ['Pacific/Apia'],
                'Asia/Baghdad':         ['Europe/Minsk', 'Europe/Moscow'],
                'Asia/Karachi':         ['Asia/Yekaterinburg'],
                'Africa/Johannesburg':  ['Asia/Gaza', 'Africa/Cairo']
            }
        },

        /**
         * Gets the offset in minutes from UTC for a certain date.
         * @param {Date} date
         * @returns {Number}
         */
        get_date_offset = function get_date_offset(date) {
            var offset = -date.getTimezoneOffset();
            return (offset !== null ? offset : 0);
        },

        /**
         * This function does some basic calculations to create information about
         * the user's timezone. It uses REFERENCE_YEAR as a solid year for which
         * the script has been tested rather than depend on the year set by the
         * client device.
         *
         * Returns a key that can be used to do lookups in jstz.olson.timezones.
         * eg: "720,1,2".
         *
         * @returns {String}
         */
        lookup_key = function lookup_key() {
            var january_offset = get_date_offset(new Date(consts.BASELINE_YEAR, 0, 2)),
                june_offset = get_date_offset(new Date(consts.BASELINE_YEAR, 5, 2)),
                diff = january_offset - june_offset;

            if (diff < 0) {
                return january_offset + ",1";
            } else if (diff > 0) {
                return june_offset + ",1," + HEMISPHERE_SOUTH;
            }

            return january_offset + ",0";
        },


        /**
         * Tries to get the time zone key directly from the operating system for those
         * environments that support the ECMAScript Internationalization API.
         */
        get_from_internationalization_api = function get_from_internationalization_api() {
            var format, timezone;
            if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
                return;
            }

            format = Intl.DateTimeFormat();

            if (typeof format === "undefined" || typeof format.resolvedOptions === "undefined") {
                return;
            }

            timezone = format.resolvedOptions().timeZone;

            if (timezone && (timezone.indexOf("/") > -1 || timezone === 'UTC')) {
                return timezone;
            }

        },

        /**
         * Starting point for getting all the DST rules for a specific year
         * for the current timezone (as described by the client system).
         *
         * Returns an object with start and end attributes, or false if no
         * DST rules were found for the year.
         *
         * @param year
         * @returns {Object} || {Boolean}
         */
        dst_dates = function dst_dates(year) {
            var yearstart = new Date(year, 0, 1, 0, 0, 1, 0).getTime();
            var yearend = new Date(year, 12, 31, 23, 59, 59).getTime();
            var current = yearstart;
            var offset = (new Date(current)).getTimezoneOffset();
            var dst_start = null;
            var dst_end = null;

            while (current < yearend - 86400000) {
                var dateToCheck = new Date(current);
                var dateToCheckOffset = dateToCheck.getTimezoneOffset();

                if (dateToCheckOffset !== offset) {
                    if (dateToCheckOffset < offset) {
                        dst_start = dateToCheck;
                    }
                    if (dateToCheckOffset > offset) {
                        dst_end = dateToCheck;
                    }
                    offset = dateToCheckOffset;
                }

                current += 86400000;
            }

            if (dst_start && dst_end) {
                return {
                    s: find_dst_fold(dst_start).getTime(),
                    e: find_dst_fold(dst_end).getTime()
                };
            }

            return false;
        },

        /**
         * Probably completely unnecessary function that recursively finds the
         * exact (to the second) time when a DST rule was changed.
         *
         * @param a_date - The candidate Date.
         * @param padding - integer specifying the padding to allow around the candidate
         *                  date for finding the fold.
         * @param iterator - integer specifying how many milliseconds to iterate while
         *                   searching for the fold.
         *
         * @returns {Date}
         */
        find_dst_fold = function find_dst_fold(a_date, padding, iterator) {
            if (typeof padding === 'undefined') {
                padding = consts.DAY;
                iterator = consts.HOUR;
            }

            var date_start = new Date(a_date.getTime() - padding).getTime();
            var date_end = a_date.getTime() + padding;
            var offset = new Date(date_start).getTimezoneOffset();

            var current = date_start;

            var dst_change = null;
            while (current < date_end - iterator) {
                var dateToCheck = new Date(current);
                var dateToCheckOffset = dateToCheck.getTimezoneOffset();

                if (dateToCheckOffset !== offset) {
                    dst_change = dateToCheck;
                    break;
                }
                current += iterator;
            }

            if (padding === consts.DAY) {
                return find_dst_fold(dst_change, consts.HOUR, consts.MINUTE);
            }

            if (padding === consts.HOUR) {
                return find_dst_fold(dst_change, consts.MINUTE, consts.SECOND);
            }

            return dst_change;
        },

        windows7_adaptations = function windows7_adaptions(rule_list, preliminary_timezone, score, sample) {
            if (score !== 'N/A') {
                return score;
            }
            if (preliminary_timezone === 'Asia/Beirut') {
                if (sample.name === 'Africa/Cairo') {
                    if (rule_list[6].s === 1398376800000 && rule_list[6].e === 1411678800000) {
                        return 0;
                    }
                }
                if (sample.name === 'Asia/Jerusalem') {
                    if (rule_list[6].s === 1395964800000 && rule_list[6].e === 1411858800000) {
                        return 0;
                }
            }
            } else if (preliminary_timezone === 'America/Santiago') {
                if (sample.name === 'America/Asuncion') {
                    if (rule_list[6].s === 1412481600000 && rule_list[6].e === 1397358000000) {
                        return 0;
                    }
                }
                if (sample.name === 'America/Campo_Grande') {
                    if (rule_list[6].s === 1413691200000 && rule_list[6].e === 1392519600000) {
                        return 0;
                    }
                }
            } else if (preliminary_timezone === 'America/Montevideo') {
                if (sample.name === 'America/Sao_Paulo') {
                    if (rule_list[6].s === 1413687600000 && rule_list[6].e === 1392516000000) {
                        return 0;
                    }
                }
            } else if (preliminary_timezone === 'Pacific/Auckland') {
                if (sample.name === 'Pacific/Fiji') {
                    if (rule_list[6].s === 1414245600000 && rule_list[6].e === 1396101600000) {
                        return 0;
                    }
                }
            }

            return score;
        },

        /**
         * Takes the DST rules for the current timezone, and proceeds to find matches
         * in the jstz.olson.dst_rules.zones array.
         *
         * Compares samples to the current timezone on a scoring basis.
         *
         * Candidates are ruled immediately if either the candidate or the current zone
         * has a DST rule where the other does not.
         *
         * Candidates are ruled out immediately if the current zone has a rule that is
         * outside the DST scope of the candidate.
         *
         * Candidates are included for scoring if the current zones rules fall within the
         * span of the samples rules.
         *
         * Low score is best, the score is calculated by summing up the differences in DST
         * rules and if the consts.MAX_SCORE is overreached the candidate is ruled out.
         *
         * Yah follow? :)
         *
         * @param rule_list
         * @param preliminary_timezone
         * @returns {*}
         */
        best_dst_match = function best_dst_match(rule_list, preliminary_timezone) {
            var score_sample = function score_sample(sample) {
                var score = 0;

                for (var j = 0; j < rule_list.length; j++) {

                    // Both sample and current time zone report DST during the year.
                    if (!!sample.rules[j] && !!rule_list[j]) {

                        // The current time zone's DST rules are inside the sample's. Include.
                        if (rule_list[j].s >= sample.rules[j].s && rule_list[j].e <= sample.rules[j].e) {
                            score = 0;
                            score += Math.abs(rule_list[j].s - sample.rules[j].s);
                            score += Math.abs(sample.rules[j].e - rule_list[j].e);

                        // The current time zone's DST rules are outside the sample's. Discard.
                        } else {
                            score = 'N/A';
                            break;
                        }

                        // The max score has been reached. Discard.
                        if (score > consts.MAX_SCORE) {
                            score = 'N/A';
                            break;
                        }
                    }
                }

                score = windows7_adaptations(rule_list, preliminary_timezone, score, sample);

                return score;
            };
            var scoreboard = {};
            var dst_zones = jstz.olson.dst_rules.zones;
            var dst_zones_length = dst_zones.length;
            var ambiguities = consts.AMBIGUITIES[preliminary_timezone];

            for (var i = 0; i < dst_zones_length; i++) {
                var sample = dst_zones[i];
                var score = score_sample(dst_zones[i]);

                if (score !== 'N/A') {
                    scoreboard[sample.name] = score;
                }
            }

            for (var tz in scoreboard) {
                if (scoreboard.hasOwnProperty(tz)) {
                    for (var j = 0; j < ambiguities.length; j++) {
                        if (ambiguities[j] === tz) {
                            return tz;
                        }
                    }
                }
            }

            return preliminary_timezone;
        },

        /**
         * Takes the preliminary_timezone as detected by lookup_key().
         *
         * Builds up the current timezones DST rules for the years defined
         * in the jstz.olson.dst_rules.years array.
         *
         * If there are no DST occurences for those years, immediately returns
         * the preliminary timezone. Otherwise proceeds and tries to solve
         * ambiguities.
         *
         * @param preliminary_timezone
         * @returns {String} timezone_name
         */
        get_by_dst = function get_by_dst(preliminary_timezone) {
            var get_rules = function get_rules() {
                var rule_list = [];
                for (var i = 0; i < jstz.olson.dst_rules.years.length; i++) {
                    var year_rules = dst_dates(jstz.olson.dst_rules.years[i]);
                    rule_list.push(year_rules);
                }
                return rule_list;
            };
            var check_has_dst = function check_has_dst(rules) {
                for (var i = 0; i < rules.length; i++) {
                    if (rules[i] !== false) {
                        return true;
                    }
                }
                return false;
            };
            var rules = get_rules();
            var has_dst = check_has_dst(rules);

            if (has_dst) {
                return best_dst_match(rules, preliminary_timezone);
            }

            return preliminary_timezone;
        },

        /**
         * Uses get_timezone_info() to formulate a key to use in the olson.timezones dictionary.
         *
         * Returns an object with one function ".name()"
         *
         * @returns Object
         */
        determine = function determine() {
            var preliminary_tz = get_from_internationalization_api();

            if (!preliminary_tz) {
                preliminary_tz = jstz.olson.timezones[lookup_key()];

                if (typeof consts.AMBIGUITIES[preliminary_tz] !== 'undefined') {
                    preliminary_tz = get_by_dst(preliminary_tz);
                }
            }

            return {
                name: function () {
                    return preliminary_tz;
                }
            };
        };

    return {
        determine: determine
    };
}());


jstz.olson = jstz.olson || {};

/**
 * The keys in this dictionary are comma separated as such:
 *
 * First the offset compared to UTC time in minutes.
 *
 * Then a flag which is 0 if the timezone does not take daylight savings into account and 1 if it
 * does.
 *
 * Thirdly an optional 's' signifies that the timezone is in the southern hemisphere,
 * only interesting for timezones with DST.
 *
 * The mapped arrays is used for constructing the jstz.TimeZone object from within
 * jstz.determine();
 */
jstz.olson.timezones = {
    '-720,0': 'Etc/GMT+12',
    '-660,0': 'Pacific/Pago_Pago',
    '-660,1,s': 'Pacific/Apia', // Why? Because windows... cry!
    '-600,1': 'America/Adak',
    '-600,0': 'Pacific/Honolulu',
    '-570,0': 'Pacific/Marquesas',
    '-540,0': 'Pacific/Gambier',
    '-540,1': 'America/Anchorage',
    '-480,1': 'America/Los_Angeles',
    '-480,0': 'Pacific/Pitcairn',
    '-420,0': 'America/Phoenix',
    '-420,1': 'America/Denver',
    '-360,0': 'America/Guatemala',
    '-360,1': 'America/Chicago',
    '-360,1,s': 'Pacific/Easter',
    '-300,0': 'America/Bogota',
    '-300,1': 'America/New_York',
    '-270,0': 'America/Caracas',
    '-240,1': 'America/Halifax',
    '-240,0': 'America/Santo_Domingo',
    '-240,1,s': 'America/Asuncion',
    '-210,1': 'America/St_Johns',
    '-180,1': 'America/Godthab',
    '-180,0': 'America/Argentina/Buenos_Aires',
    '-180,1,s': 'America/Montevideo',
    '-120,0': 'America/Noronha',
    '-120,1': 'America/Noronha',
    '-60,1': 'Atlantic/Azores',
    '-60,0': 'Atlantic/Cape_Verde',
    '0,0': 'UTC',
    '0,1': 'Europe/London',
    '60,1': 'Europe/Berlin',
    '60,0': 'Africa/Lagos',
    '60,1,s': 'Africa/Windhoek',
    '120,1': 'Asia/Beirut',
    '120,0': 'Africa/Johannesburg',
    '180,0': 'Asia/Baghdad',
    '180,1': 'Europe/Moscow',
    '210,1': 'Asia/Tehran',
    '240,0': 'Asia/Dubai',
    '240,1': 'Asia/Baku',
    '270,0': 'Asia/Kabul',
    '300,1': 'Asia/Yekaterinburg',
    '300,0': 'Asia/Karachi',
    '330,0': 'Asia/Kolkata',
    '345,0': 'Asia/Kathmandu',
    '360,0': 'Asia/Dhaka',
    '360,1': 'Asia/Omsk',
    '390,0': 'Asia/Rangoon',
    '420,1': 'Asia/Krasnoyarsk',
    '420,0': 'Asia/Jakarta',
    '480,0': 'Asia/Shanghai',
    '480,1': 'Asia/Irkutsk',
    '525,0': 'Australia/Eucla',
    '525,1,s': 'Australia/Eucla',
    '540,1': 'Asia/Yakutsk',
    '540,0': 'Asia/Tokyo',
    '570,0': 'Australia/Darwin',
    '570,1,s': 'Australia/Adelaide',
    '600,0': 'Australia/Brisbane',
    '600,1': 'Asia/Vladivostok',
    '600,1,s': 'Australia/Sydney',
    '630,1,s': 'Australia/Lord_Howe',
    '660,1': 'Asia/Kamchatka',
    '660,0': 'Pacific/Noumea',
    '690,0': 'Pacific/Norfolk',
    '720,1,s': 'Pacific/Auckland',
    '720,0': 'Pacific/Majuro',
    '765,1,s': 'Pacific/Chatham',
    '780,0': 'Pacific/Tongatapu',
    '780,1,s': 'Pacific/Apia',
    '840,0': 'Pacific/Kiritimati'
};

/* Build time: 2015-11-02 13:01:00Z Build by invoking python utilities/dst.py generate */
jstz.olson.dst_rules = {
    "years": [
        2008,
        2009,
        2010,
        2011,
        2012,
        2013,
        2014
    ],
    "zones": [
        {
            "name": "Africa/Cairo",
            "rules": [
                {
                    "e": 1219957200000,
                    "s": 1209074400000
                },
                {
                    "e": 1250802000000,
                    "s": 1240524000000
                },
                {
                    "e": 1285880400000,
                    "s": 1284069600000
                },
                false,
                false,
                false,
                {
                    "e": 1411678800000,
                    "s": 1406844000000
                }
            ]
        },
        {
            "name": "Africa/Casablanca",
            "rules": [
                {
                    "e": 1220223600000,
                    "s": 1212278400000
                },
                {
                    "e": 1250809200000,
                    "s": 1243814400000
                },
                {
                    "e": 1281222000000,
                    "s": 1272758400000
                },
                {
                    "e": 1312066800000,
                    "s": 1301788800000
                },
                {
                    "e": 1348970400000,
                    "s": 1345428000000
                },
                {
                    "e": 1382839200000,
                    "s": 1376100000000
                },
                {
                    "e": 1414288800000,
                    "s": 1406944800000
                }
            ]
        },
        {
            "name": "America/Asuncion",
            "rules": [
                {
                    "e": 1205031600000,
                    "s": 1224388800000
                },
                {
                    "e": 1236481200000,
                    "s": 1255838400000
                },
                {
                    "e": 1270954800000,
                    "s": 1286078400000
                },
                {
                    "e": 1302404400000,
                    "s": 1317528000000
                },
                {
                    "e": 1333854000000,
                    "s": 1349582400000
                },
                {
                    "e": 1364094000000,
                    "s": 1381032000000
                },
                {
                    "e": 1395543600000,
                    "s": 1412481600000
                }
            ]
        },
        {
            "name": "America/Campo_Grande",
            "rules": [
                {
                    "e": 1203217200000,
                    "s": 1224388800000
                },
                {
                    "e": 1234666800000,
                    "s": 1255838400000
                },
                {
                    "e": 1266721200000,
                    "s": 1287288000000
                },
                {
                    "e": 1298170800000,
                    "s": 1318737600000
                },
                {
                    "e": 1330225200000,
                    "s": 1350792000000
                },
                {
                    "e": 1361070000000,
                    "s": 1382241600000
                },
                {
                    "e": 1392519600000,
                    "s": 1413691200000
                }
            ]
        },
        {
            "name": "America/Goose_Bay",
            "rules": [
                {
                    "e": 1225594860000,
                    "s": 1205035260000
                },
                {
                    "e": 1257044460000,
                    "s": 1236484860000
                },
                {
                    "e": 1289098860000,
                    "s": 1268539260000
                },
                {
                    "e": 1320555600000,
                    "s": 1299988860000
                },
                {
                    "e": 1352005200000,
                    "s": 1331445600000
                },
                {
                    "e": 1383454800000,
                    "s": 1362895200000
                },
                {
                    "e": 1414904400000,
                    "s": 1394344800000
                }
            ]
        },
        {
            "name": "America/Havana",
            "rules": [
                {
                    "e": 1224997200000,
                    "s": 1205643600000
                },
                {
                    "e": 1256446800000,
                    "s": 1236488400000
                },
                {
                    "e": 1288501200000,
                    "s": 1268542800000
                },
                {
                    "e": 1321160400000,
                    "s": 1300597200000
                },
                {
                    "e": 1352005200000,
                    "s": 1333256400000
                },
                {
                    "e": 1383454800000,
                    "s": 1362891600000
                },
                {
                    "e": 1414904400000,
                    "s": 1394341200000
                }
            ]
        },
        {
            "name": "America/Mazatlan",
            "rules": [
                {
                    "e": 1225008000000,
                    "s": 1207472400000
                },
                {
                    "e": 1256457600000,
                    "s": 1238922000000
                },
                {
                    "e": 1288512000000,
                    "s": 1270371600000
                },
                {
                    "e": 1319961600000,
                    "s": 1301821200000
                },
                {
                    "e": 1351411200000,
                    "s": 1333270800000
                },
                {
                    "e": 1382860800000,
                    "s": 1365325200000
                },
                {
                    "e": 1414310400000,
                    "s": 1396774800000
                }
            ]
        },
        {
            "name": "America/Mexico_City",
            "rules": [
                {
                    "e": 1225004400000,
                    "s": 1207468800000
                },
                {
                    "e": 1256454000000,
                    "s": 1238918400000
                },
                {
                    "e": 1288508400000,
                    "s": 1270368000000
                },
                {
                    "e": 1319958000000,
                    "s": 1301817600000
                },
                {
                    "e": 1351407600000,
                    "s": 1333267200000
                },
                {
                    "e": 1382857200000,
                    "s": 1365321600000
                },
                {
                    "e": 1414306800000,
                    "s": 1396771200000
                }
            ]
        },
        {
            "name": "America/Miquelon",
            "rules": [
                {
                    "e": 1225598400000,
                    "s": 1205038800000
                },
                {
                    "e": 1257048000000,
                    "s": 1236488400000
                },
                {
                    "e": 1289102400000,
                    "s": 1268542800000
                },
                {
                    "e": 1320552000000,
                    "s": 1299992400000
                },
                {
                    "e": 1352001600000,
                    "s": 1331442000000
                },
                {
                    "e": 1383451200000,
                    "s": 1362891600000
                },
                {
                    "e": 1414900800000,
                    "s": 1394341200000
                }
            ]
        },
        {
            "name": "America/Santa_Isabel",
            "rules": [
                {
                    "e": 1225011600000,
                    "s": 1207476000000
                },
                {
                    "e": 1256461200000,
                    "s": 1238925600000
                },
                {
                    "e": 1288515600000,
                    "s": 1270375200000
                },
                {
                    "e": 1319965200000,
                    "s": 1301824800000
                },
                {
                    "e": 1351414800000,
                    "s": 1333274400000
                },
                {
                    "e": 1382864400000,
                    "s": 1365328800000
                },
                {
                    "e": 1414314000000,
                    "s": 1396778400000
                }
            ]
        },
        {
            "name": "America/Santiago",
            "rules": [
                {
                    "e": 1206846000000,
                    "s": 1223784000000
                },
                {
                    "e": 1237086000000,
                    "s": 1255233600000
                },
                {
                    "e": 1270350000000,
                    "s": 1286683200000
                },
                {
                    "e": 1304823600000,
                    "s": 1313899200000
                },
                {
                    "e": 1335668400000,
                    "s": 1346558400000
                },
                {
                    "e": 1367118000000,
                    "s": 1378612800000
                },
                {
                    "e": 1398567600000,
                    "s": 1410062400000
                }
            ]
        },
        {
            "name": "America/Sao_Paulo",
            "rules": [
                {
                    "e": 1203213600000,
                    "s": 1224385200000
                },
                {
                    "e": 1234663200000,
                    "s": 1255834800000
                },
                {
                    "e": 1266717600000,
                    "s": 1287284400000
                },
                {
                    "e": 1298167200000,
                    "s": 1318734000000
                },
                {
                    "e": 1330221600000,
                    "s": 1350788400000
                },
                {
                    "e": 1361066400000,
                    "s": 1382238000000
                },
                {
                    "e": 1392516000000,
                    "s": 1413687600000
                }
            ]
        },
        {
            "name": "Asia/Amman",
            "rules": [
                {
                    "e": 1225404000000,
                    "s": 1206655200000
                },
                {
                    "e": 1256853600000,
                    "s": 1238104800000
                },
                {
                    "e": 1288303200000,
                    "s": 1269554400000
                },
                {
                    "e": 1319752800000,
                    "s": 1301608800000
                },
                false,
                false,
                {
                    "e": 1414706400000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Damascus",
            "rules": [
                {
                    "e": 1225486800000,
                    "s": 1207260000000
                },
                {
                    "e": 1256850000000,
                    "s": 1238104800000
                },
                {
                    "e": 1288299600000,
                    "s": 1270159200000
                },
                {
                    "e": 1319749200000,
                    "s": 1301608800000
                },
                {
                    "e": 1351198800000,
                    "s": 1333058400000
                },
                {
                    "e": 1382648400000,
                    "s": 1364508000000
                },
                {
                    "e": 1414702800000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Dubai",
            "rules": [
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Gaza",
            "rules": [
                {
                    "e": 1219957200000,
                    "s": 1206655200000
                },
                {
                    "e": 1252015200000,
                    "s": 1238104800000
                },
                {
                    "e": 1281474000000,
                    "s": 1269640860000
                },
                {
                    "e": 1312146000000,
                    "s": 1301608860000
                },
                {
                    "e": 1348178400000,
                    "s": 1333058400000
                },
                {
                    "e": 1380229200000,
                    "s": 1364508000000
                },
                {
                    "e": 1414098000000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Irkutsk",
            "rules": [
                {
                    "e": 1224957600000,
                    "s": 1206813600000
                },
                {
                    "e": 1256407200000,
                    "s": 1238263200000
                },
                {
                    "e": 1288461600000,
                    "s": 1269712800000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Jerusalem",
            "rules": [
                {
                    "e": 1223161200000,
                    "s": 1206662400000
                },
                {
                    "e": 1254006000000,
                    "s": 1238112000000
                },
                {
                    "e": 1284246000000,
                    "s": 1269561600000
                },
                {
                    "e": 1317510000000,
                    "s": 1301616000000
                },
                {
                    "e": 1348354800000,
                    "s": 1333065600000
                },
                {
                    "e": 1382828400000,
                    "s": 1364515200000
                },
                {
                    "e": 1414278000000,
                    "s": 1395964800000
                }
            ]
        },
        {
            "name": "Asia/Kamchatka",
            "rules": [
                {
                    "e": 1224943200000,
                    "s": 1206799200000
                },
                {
                    "e": 1256392800000,
                    "s": 1238248800000
                },
                {
                    "e": 1288450800000,
                    "s": 1269698400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Krasnoyarsk",
            "rules": [
                {
                    "e": 1224961200000,
                    "s": 1206817200000
                },
                {
                    "e": 1256410800000,
                    "s": 1238266800000
                },
                {
                    "e": 1288465200000,
                    "s": 1269716400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Omsk",
            "rules": [
                {
                    "e": 1224964800000,
                    "s": 1206820800000
                },
                {
                    "e": 1256414400000,
                    "s": 1238270400000
                },
                {
                    "e": 1288468800000,
                    "s": 1269720000000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Vladivostok",
            "rules": [
                {
                    "e": 1224950400000,
                    "s": 1206806400000
                },
                {
                    "e": 1256400000000,
                    "s": 1238256000000
                },
                {
                    "e": 1288454400000,
                    "s": 1269705600000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yakutsk",
            "rules": [
                {
                    "e": 1224954000000,
                    "s": 1206810000000
                },
                {
                    "e": 1256403600000,
                    "s": 1238259600000
                },
                {
                    "e": 1288458000000,
                    "s": 1269709200000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yekaterinburg",
            "rules": [
                {
                    "e": 1224968400000,
                    "s": 1206824400000
                },
                {
                    "e": 1256418000000,
                    "s": 1238274000000
                },
                {
                    "e": 1288472400000,
                    "s": 1269723600000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yerevan",
            "rules": [
                {
                    "e": 1224972000000,
                    "s": 1206828000000
                },
                {
                    "e": 1256421600000,
                    "s": 1238277600000
                },
                {
                    "e": 1288476000000,
                    "s": 1269727200000
                },
                {
                    "e": 1319925600000,
                    "s": 1301176800000
                },
                false,
                false,
                false
            ]
        },
        {
            "name": "Australia/Lord_Howe",
            "rules": [
                {
                    "e": 1207407600000,
                    "s": 1223134200000
                },
                {
                    "e": 1238857200000,
                    "s": 1254583800000
                },
                {
                    "e": 1270306800000,
                    "s": 1286033400000
                },
                {
                    "e": 1301756400000,
                    "s": 1317483000000
                },
                {
                    "e": 1333206000000,
                    "s": 1349537400000
                },
                {
                    "e": 1365260400000,
                    "s": 1380987000000
                },
                {
                    "e": 1396710000000,
                    "s": 1412436600000
                }
            ]
        },
        {
            "name": "Australia/Perth",
            "rules": [
                {
                    "e": 1206813600000,
                    "s": 1224957600000
                },
                false,
                false,
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Europe/Helsinki",
            "rules": [
                {
                    "e": 1224982800000,
                    "s": 1206838800000
                },
                {
                    "e": 1256432400000,
                    "s": 1238288400000
                },
                {
                    "e": 1288486800000,
                    "s": 1269738000000
                },
                {
                    "e": 1319936400000,
                    "s": 1301187600000
                },
                {
                    "e": 1351386000000,
                    "s": 1332637200000
                },
                {
                    "e": 1382835600000,
                    "s": 1364691600000
                },
                {
                    "e": 1414285200000,
                    "s": 1396141200000
                }
            ]
        },
        {
            "name": "Europe/Minsk",
            "rules": [
                {
                    "e": 1224979200000,
                    "s": 1206835200000
                },
                {
                    "e": 1256428800000,
                    "s": 1238284800000
                },
                {
                    "e": 1288483200000,
                    "s": 1269734400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Europe/Moscow",
            "rules": [
                {
                    "e": 1224975600000,
                    "s": 1206831600000
                },
                {
                    "e": 1256425200000,
                    "s": 1238281200000
                },
                {
                    "e": 1288479600000,
                    "s": 1269730800000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Pacific/Apia",
            "rules": [
                false,
                false,
                false,
                {
                    "e": 1301752800000,
                    "s": 1316872800000
                },
                {
                    "e": 1333202400000,
                    "s": 1348927200000
                },
                {
                    "e": 1365256800000,
                    "s": 1380376800000
                },
                {
                    "e": 1396706400000,
                    "s": 1411826400000
                }
            ]
        },
        {
            "name": "Pacific/Fiji",
            "rules": [
                false,
                false,
                {
                    "e": 1269698400000,
                    "s": 1287842400000
                },
                {
                    "e": 1327154400000,
                    "s": 1319292000000
                },
                {
                    "e": 1358604000000,
                    "s": 1350741600000
                },
                {
                    "e": 1390050000000,
                    "s": 1382796000000
                },
                {
                    "e": 1421503200000,
                    "s": 1414850400000
                }
            ]
        },
        {
            "name": "Europe/London",
            "rules": [
                {
                    "e": 1224982800000,
                    "s": 1206838800000
                },
                {
                    "e": 1256432400000,
                    "s": 1238288400000
                },
                {
                    "e": 1288486800000,
                    "s": 1269738000000
                },
                {
                    "e": 1319936400000,
                    "s": 1301187600000
                },
                {
                    "e": 1351386000000,
                    "s": 1332637200000
                },
                {
                    "e": 1382835600000,
                    "s": 1364691600000
                },
                {
                    "e": 1414285200000,
                    "s": 1396141200000
                }
            ]
        }
    ]
};
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = jstz;
} else if ((typeof define !== 'undefined' && define !== null) && (define.amd != null)) {
    define([], function() {
        return jstz;
    });
} else {
    if (typeof root === 'undefined') {
        window.jstz = jstz;
    } else {
        root.jstz = jstz;
    }
}
}());

},{}],19:[function(require,module,exports){
(function(){
  var _global = this;

  /**
   * JS Implementation of MurmurHash2
   *
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   *
   * @param {string} str ASCII only
   * @param {number} seed Positive integer only
   * @return {number} 32-bit positive integer hash
   */
  function MurmurHashV2(str, seed) {
    var
      l = str.length,
      h = seed ^ l,
      i = 0,
      k;

    while (l >= 4) {
      k =
        ((str.charCodeAt(i) & 0xff)) |
        ((str.charCodeAt(++i) & 0xff) << 8) |
        ((str.charCodeAt(++i) & 0xff) << 16) |
        ((str.charCodeAt(++i) & 0xff) << 24);

      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
      k ^= k >>> 24;
      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

      l -= 4;
      ++i;
    }

    switch (l) {
    case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    case 1: h ^= (str.charCodeAt(i) & 0xff);
            h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    }

    h ^= h >>> 13;
    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    h ^= h >>> 15;

    return h >>> 0;
  };

  /**
   * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
   *
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   *
   * @param {string} key ASCII only
   * @param {number} seed Positive integer only
   * @return {number} 32-bit positive integer hash
   */
  function MurmurHashV3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
          ((key.charCodeAt(i) & 0xff)) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
      ++i;

      k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

      h1 ^= k1;
          h1 = (h1 << 13) | (h1 >>> 19);
      h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
      case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      case 1: k1 ^= (key.charCodeAt(i) & 0xff);

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  var murmur = MurmurHashV3;
  murmur.v2 = MurmurHashV2;
  murmur.v3 = MurmurHashV3;

  if (typeof(module) != 'undefined') {
    module.exports = murmur;
  } else {
    var _previousRoot = _global.murmur;
    murmur.noConflict = function() {
      _global.murmur = _previousRoot;
      return murmur;
    }
    _global.murmur = murmur;
  }
}());

},{}],20:[function(require,module,exports){
var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

module.exports = charenc;

},{}],21:[function(require,module,exports){
(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();

},{}],22:[function(require,module,exports){
(function (Buffer){
(function() {
  var crypt = require('crypt'),
      utf8 = require('charenc').utf8,
      bin = require('charenc').bin,

  // The core
  sha1 = function (message) {
    // Convert to byte array
    if (message.constructor == String)
      message = utf8.stringToBytes(message);
    else if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer == 'function' && Buffer.isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message))
      message = message.toString();

    // otherwise assume byte array

    var m  = crypt.bytesToWords(message),
        l  = message.length * 8,
        w  = [],
        H0 =  1732584193,
        H1 = -271733879,
        H2 = -1732584194,
        H3 =  271733878,
        H4 = -1009589776;

    // Padding
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >>> 9) << 4) + 15] = l;

    for (var i = 0; i < m.length; i += 16) {
      var a = H0,
          b = H1,
          c = H2,
          d = H3,
          e = H4;

      for (var j = 0; j < 80; j++) {

        if (j < 16)
          w[j] = m[i + j];
        else {
          var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
          w[j] = (n << 1) | (n >>> 31);
        }

        var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
                j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
                j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
                j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
                         (H1 ^ H2 ^ H3) - 899497514);

        H4 = H3;
        H3 = H2;
        H2 = (H1 << 30) | (H1 >>> 2);
        H1 = H0;
        H0 = t;
      }

      H0 += a;
      H1 += b;
      H2 += c;
      H3 += d;
      H4 += e;
    }

    return [H0, H1, H2, H3, H4];
  },

  // Public API
  api = function (message, options) {
    var digestbytes = crypt.wordsToBytes(sha1(message));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt.bytesToHex(digestbytes);
  };

  api._blocksize = 16;
  api._digestsize = 20;

  module.exports = api;
})();

}).call(this,require("buffer").Buffer)
},{"buffer":1,"charenc":20,"crypt":21}],23:[function(require,module,exports){
"use strict";
var core_1 = require("./lib/core");
exports.trackerCore = core_1.trackerCore;

},{"./lib/core":25}],24:[function(require,module,exports){
"use strict";
function base64encode(data) {
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc, tmp_arr = [];
    if (!data) {
        return data;
    }
    data = unescape(encodeURIComponent(data));
    do {
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);
        bits = o1 << 16 | o2 << 8 | o3;
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);
    enc = tmp_arr.join('');
    var r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
}
exports.base64encode = base64encode;

},{}],25:[function(require,module,exports){
"use strict";
var uuid = require('uuid');
var payload = require('./payload');
function getTimestamp(tstamp) {
    if (tstamp == null) {
        return { type: 'dtm', value: new Date().getTime() };
    }
    else if (typeof tstamp === 'number') {
        return { type: 'dtm', value: tstamp };
    }
    else if (tstamp.type === 'ttm') {
        return { type: 'ttm', value: tstamp.value };
    }
    else {
        return { type: 'dtm', value: (tstamp.value || new Date().getTime()) };
    }
}
function trackerCore(base64, callback) {
    if (typeof base64 === 'undefined') {
        base64 = true;
    }
    var payloadPairs = {};
    function addPayloadPair(key, value) {
        payloadPairs[key] = value;
    }
    function removeEmptyProperties(eventJson, exemptFields) {
        var ret = {};
        exemptFields = exemptFields || {};
        for (var k in eventJson) {
            if (exemptFields[k] || (eventJson[k] !== null && typeof eventJson[k] !== 'undefined')) {
                ret[k] = eventJson[k];
            }
        }
        return ret;
    }
    function completeContexts(contexts) {
        if (contexts && contexts.length) {
            return {
                schema: 'iglu:com.snowplowanalytics.snowplow/contexts/jsonschema/1-0-0',
                data: contexts
            };
        }
    }
    function track(sb, context, tstamp) {
        sb.addDict(payloadPairs);
        sb.add('eid', uuid.v4());
        var timestamp = getTimestamp(tstamp);
        sb.add(timestamp.type, timestamp.value.toString());
        var wrappedContexts = completeContexts(context);
        if (wrappedContexts !== undefined) {
            sb.addJson('cx', 'co', wrappedContexts);
        }
        if (typeof callback === 'function') {
            callback(sb);
        }
        return sb;
    }
    function trackSelfDescribingEvent(properties, context, tstamp) {
        var sb = payload.payloadBuilder(base64);
        var ueJson = {
            schema: 'iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0',
            data: properties
        };
        sb.add('e', 'ue');
        sb.addJson('ue_px', 'ue_pr', ueJson);
        return track(sb, context, tstamp);
    }
    return {
        setBase64Encoding: function (encode) {
            base64 = encode;
        },
        addPayloadPair: addPayloadPair,
        addPayloadDict: function (dict) {
            for (var key in dict) {
                if (dict.hasOwnProperty(key)) {
                    payloadPairs[key] = dict[key];
                }
            }
        },
        resetPayloadPairs: function (dict) {
            payloadPairs = payload.isJson(dict) ? dict : {};
        },
        setTrackerVersion: function (version) {
            addPayloadPair('tv', version);
        },
        setTrackerNamespace: function (name) {
            addPayloadPair('tna', name);
        },
        setAppId: function (appId) {
            addPayloadPair('aid', appId);
        },
        setPlatform: function (value) {
            addPayloadPair('p', value);
        },
        setUserId: function (userId) {
            addPayloadPair('uid', userId);
        },
        setScreenResolution: function (width, height) {
            addPayloadPair('res', width + 'x' + height);
        },
        setViewport: function (width, height) {
            addPayloadPair('vp', width + 'x' + height);
        },
        setColorDepth: function (depth) {
            addPayloadPair('cd', depth);
        },
        setTimezone: function (timezone) {
            addPayloadPair('tz', timezone);
        },
        setLang: function (lang) {
            addPayloadPair('lang', lang);
        },
        setIpAddress: function (ip) {
            addPayloadPair('ip', ip);
        },
        trackUnstructEvent: trackSelfDescribingEvent,
        trackSelfDescribingEvent: trackSelfDescribingEvent,
        trackPageView: function (pageUrl, pageTitle, referrer, context, tstamp) {
            var sb = payload.payloadBuilder(base64);
            sb.add('e', 'pv');
            sb.add('url', pageUrl);
            sb.add('page', pageTitle);
            sb.add('refr', referrer);
            return track(sb, context, tstamp);
        },
        trackPagePing: function (pageUrl, pageTitle, referrer, minXOffset, maxXOffset, minYOffset, maxYOffset, context, tstamp) {
            var sb = payload.payloadBuilder(base64);
            sb.add('e', 'pp');
            sb.add('url', pageUrl);
            sb.add('page', pageTitle);
            sb.add('refr', referrer);
            sb.add('pp_mix', minXOffset.toString());
            sb.add('pp_max', maxXOffset.toString());
            sb.add('pp_miy', minYOffset.toString());
            sb.add('pp_may', maxYOffset.toString());
            return track(sb, context, tstamp);
        },
        trackStructEvent: function (category, action, label, property, value, context, tstamp) {
            var sb = payload.payloadBuilder(base64);
            sb.add('e', 'se');
            sb.add('se_ca', category);
            sb.add('se_ac', action);
            sb.add('se_la', label);
            sb.add('se_pr', property);
            sb.add('se_va', (value == null ? undefined : value.toString()));
            return track(sb, context, tstamp);
        },
        trackEcommerceTransaction: function (orderId, affiliation, totalValue, taxValue, shipping, city, state, country, currency, context, tstamp) {
            var sb = payload.payloadBuilder(base64);
            sb.add('e', 'tr');
            sb.add("tr_id", orderId);
            sb.add("tr_af", affiliation);
            sb.add("tr_tt", totalValue);
            sb.add("tr_tx", taxValue);
            sb.add("tr_sh", shipping);
            sb.add("tr_ci", city);
            sb.add("tr_st", state);
            sb.add("tr_co", country);
            sb.add("tr_cu", currency);
            return track(sb, context, tstamp);
        },
        trackEcommerceTransactionItem: function (orderId, sku, name, category, price, quantity, currency, context, tstamp) {
            var sb = payload.payloadBuilder(base64);
            sb.add("e", "ti");
            sb.add("ti_id", orderId);
            sb.add("ti_sk", sku);
            sb.add("ti_nm", name);
            sb.add("ti_ca", category);
            sb.add("ti_pr", price);
            sb.add("ti_qu", quantity);
            sb.add("ti_cu", currency);
            return track(sb, context, tstamp);
        },
        trackScreenView: function (name, id, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/screen_view/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    name: name,
                    id: id
                })
            }, context, tstamp);
        },
        trackLinkClick: function (targetUrl, elementId, elementClasses, elementTarget, elementContent, context, tstamp) {
            var eventJson = {
                schema: 'iglu:com.snowplowanalytics.snowplow/link_click/jsonschema/1-0-1',
                data: removeEmptyProperties({
                    targetUrl: targetUrl,
                    elementId: elementId,
                    elementClasses: elementClasses,
                    elementTarget: elementTarget,
                    elementContent: elementContent
                })
            };
            return trackSelfDescribingEvent(eventJson, context, tstamp);
        },
        trackAdImpression: function (impressionId, costModel, cost, targetUrl, bannerId, zoneId, advertiserId, campaignId, context, tstamp) {
            var eventJson = {
                schema: 'iglu:com.snowplowanalytics.snowplow/ad_impression/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    impressionId: impressionId,
                    costModel: costModel,
                    cost: cost,
                    targetUrl: targetUrl,
                    bannerId: bannerId,
                    zoneId: zoneId,
                    advertiserId: advertiserId,
                    campaignId: campaignId
                })
            };
            return trackSelfDescribingEvent(eventJson, context, tstamp);
        },
        trackAdClick: function (targetUrl, clickId, costModel, cost, bannerId, zoneId, impressionId, advertiserId, campaignId, context, tstamp) {
            var eventJson = {
                schema: 'iglu:com.snowplowanalytics.snowplow/ad_click/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    targetUrl: targetUrl,
                    clickId: clickId,
                    costModel: costModel,
                    cost: cost,
                    bannerId: bannerId,
                    zoneId: zoneId,
                    impressionId: impressionId,
                    advertiserId: advertiserId,
                    campaignId: campaignId
                })
            };
            return trackSelfDescribingEvent(eventJson, context, tstamp);
        },
        trackAdConversion: function (conversionId, costModel, cost, category, action, property, initialValue, advertiserId, campaignId, context, tstamp) {
            var eventJson = {
                schema: 'iglu:com.snowplowanalytics.snowplow/ad_conversion/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    conversionId: conversionId,
                    costModel: costModel,
                    cost: cost,
                    category: category,
                    action: action,
                    property: property,
                    initialValue: initialValue,
                    advertiserId: advertiserId,
                    campaignId: campaignId
                })
            };
            return trackSelfDescribingEvent(eventJson, context, tstamp);
        },
        trackSocialInteraction: function (action, network, target, context, tstamp) {
            var eventJson = {
                schema: 'iglu:com.snowplowanalytics.snowplow/social_interaction/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    action: action,
                    network: network,
                    target: target
                })
            };
            return trackSelfDescribingEvent(eventJson, context, tstamp);
        },
        trackAddToCart: function (sku, name, category, unitPrice, quantity, currency, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/add_to_cart/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    sku: sku,
                    name: name,
                    category: category,
                    unitPrice: unitPrice,
                    quantity: quantity,
                    currency: currency
                })
            }, context, tstamp);
        },
        trackRemoveFromCart: function (sku, name, category, unitPrice, quantity, currency, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/remove_from_cart/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    sku: sku,
                    name: name,
                    category: category,
                    unitPrice: unitPrice,
                    quantity: quantity,
                    currency: currency
                })
            }, context, tstamp);
        },
        trackFormChange: function (formId, elementId, nodeName, type, elementClasses, value, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/change_form/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    formId: formId,
                    elementId: elementId,
                    nodeName: nodeName,
                    type: type,
                    elementClasses: elementClasses,
                    value: value
                }, { value: true })
            }, context, tstamp);
        },
        trackFormSubmission: function (formId, formClasses, elements, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/submit_form/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    formId: formId,
                    formClasses: formClasses,
                    elements: elements
                })
            }, context, tstamp);
        },
        trackSiteSearch: function (terms, filters, totalResults, pageResults, context, tstamp) {
            return trackSelfDescribingEvent({
                schema: 'iglu:com.snowplowanalytics.snowplow/site_search/jsonschema/1-0-0',
                data: removeEmptyProperties({
                    terms: terms,
                    filters: filters,
                    totalResults: totalResults,
                    pageResults: pageResults
                })
            }, context, tstamp);
        }
    };
}
exports.trackerCore = trackerCore;

},{"./payload":26,"uuid":28}],26:[function(require,module,exports){
"use strict";
var base64 = require('./base64');
function base64urlencode(data) {
    if (!data) {
        return data;
    }
    var enc = base64.base64encode(data);
    return enc.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function isNonEmptyJson(property) {
    if (!isJson(property)) {
        return false;
    }
    for (var key in property) {
        if (property.hasOwnProperty(key)) {
            return true;
        }
    }
    return false;
}
exports.isNonEmptyJson = isNonEmptyJson;
function isJson(property) {
    return (typeof property !== 'undefined' && property !== null &&
        (property.constructor === {}.constructor || property.constructor === [].constructor));
}
exports.isJson = isJson;
function payloadBuilder(base64Encode) {
    var dict = {};
    var add = function (key, value) {
        if (value != null && value !== '') {
            dict[key] = value;
        }
    };
    var addDict = function (dict) {
        for (var key in dict) {
            if (dict.hasOwnProperty(key)) {
                add(key, dict[key]);
            }
        }
    };
    var addJson = function (keyIfEncoded, keyIfNotEncoded, json) {
        if (isNonEmptyJson(json)) {
            var str = JSON.stringify(json);
            if (base64Encode) {
                add(keyIfEncoded, base64urlencode(str));
            }
            else {
                add(keyIfNotEncoded, str);
            }
        }
    };
    return {
        add: add,
        addDict: addDict,
        addJson: addJson,
        build: function () {
            return dict;
        }
    };
}
exports.payloadBuilder = payloadBuilder;

},{"./base64":24}],27:[function(require,module,exports){
(function (global){

var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],28:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":27}],29:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":32,"./v4":33}],30:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],31:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],32:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":30,"./lib/rng":31}],33:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":30,"./lib/rng":31}]},{},[8]);
