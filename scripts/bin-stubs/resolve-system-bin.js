'use strict';
const fs = require('fs');
const path = require('path');

// Retorna o caminho absoluto do binário no PATH; se não achar, devolve só o
// nome (o execa tenta resolver na hora de rodar e o YLT trata a falha).
module.exports = (name) => {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const candidate = path.join(dir, exe);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return exe;
};
