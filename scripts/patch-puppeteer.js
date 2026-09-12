const fs = require('fs');
const path = require('path');

// 1. Patch Puppeteer-core missing context crash in FrameManager (CJS and ESM)
const frameManagerTargets = [
  path.join(__dirname, '../node_modules/puppeteer-core/lib/cjs/puppeteer/cdp/FrameManager.js'),
  path.join(__dirname, '../backend/node_modules/puppeteer-core/lib/cjs/puppeteer/cdp/FrameManager.js'),
  path.join(__dirname, 'node_modules/puppeteer-core/lib/cjs/puppeteer/cdp/FrameManager.js'),
  path.join(__dirname, '../node_modules/puppeteer-core/lib/esm/puppeteer/cdp/FrameManager.js'),
  path.join(__dirname, '../backend/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/FrameManager.js'),
  path.join(__dirname, 'node_modules/puppeteer-core/lib/esm/puppeteer/cdp/FrameManager.js'),
];

frameManagerTargets.forEach((file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('missing context with id')) {
      // Replace CJS assert
      content = content.replace(
        /\(0, assert_js_1\.assert\)\(context, 'INTERNAL ERROR: missing context with id = ' \+ contextId\);/g,
        '/* patched missing context error */'
      );
      // Replace ESM assert
      content = content.replace(
        /assert\(context, 'INTERNAL ERROR: missing context with id = ' \+ contextId\);/g,
        '/* patched missing context error */'
      );
      fs.writeFileSync(file, content);
      console.log(`✔ Sucesso: Puppeteer-core FrameManager patcheado em ${file}`);
    }
  }
});

// 2. Patch YellowLabTools phantomasWrapper to allow disabling wait-for-network-idle for huge speedups
const phantomasWrapperTargets = [
  path.join(__dirname, '../node_modules/yellowlabtools/lib/tools/phantomas/phantomasWrapper.js'),
  path.join(__dirname, '../backend/node_modules/yellowlabtools/lib/tools/phantomas/phantomasWrapper.js'),
];

phantomasWrapperTargets.forEach((file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes("'wait-for-network-idle': true")) {
      content = content.replace(
        "'wait-for-network-idle': true",
        "'wait-for-network-idle': (task.options.waitForNetworkIdle !== undefined ? task.options.waitForNetworkIdle : false)"
      );
      fs.writeFileSync(file, content);
      console.log(`✔ Sucesso: YellowLabTools phantomasWrapper patcheado em ${file}`);
    }
  }
});

// 3. Patch YellowLabTools redownload concurrency and timeout for faster asset checking
const redownloadTargets = [
  path.join(__dirname, '../node_modules/yellowlabtools/lib/tools/redownload/redownload.js'),
  path.join(__dirname, '../backend/node_modules/yellowlabtools/lib/tools/redownload/redownload.js'),
];

redownloadTargets.forEach((file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/var MAX_PARALLEL_DOWNLOADS = \d+;/g, 'var MAX_PARALLEL_DOWNLOADS = 25;');
    content = content.replace(/var REQUEST_TIMEOUT = \d+;/g, 'var REQUEST_TIMEOUT = 5000;');

    // Skip downloading third-party ad & tracking beacons during asset check
    const trackerCheck = `if (/(googletagmanager|google-analytics|doubleclick|facebook|clarity\\.ms|hotjar|criteo|onetrust|cookielaw|scorecardresearch|bat\\.bing)/i.test(entry.url)) {\n            notDownloadableFile('tracker skipped');\n            return deferred.promise;\n        }`;
    if (!content.includes('tracker skipped') && content.includes("if (entry.url === 'about:blank') {")) {
      content = content.replace(
        "if (entry.url === 'about:blank') {",
        `${trackerCheck}\n\n        if (entry.url === 'about:blank') {`
      );
    }

    fs.writeFileSync(file, content);
    console.log(`✔ Sucesso: YellowLabTools redownload otimizado em ${file}`);
  }
});


