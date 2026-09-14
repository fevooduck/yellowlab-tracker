'use strict';
// Stub de jpegoptim-bin (ver scripts/bin-stubs/README.md). Aponta para um
// wrapper do jpegoptim do sistema que contorna o bug do --stdin na 1.4.x.
const path = require('path');

module.exports = process.platform === 'win32'
  ? require('../resolve-system-bin')('jpegoptim')
  : path.join(__dirname, 'jpegoptim');
