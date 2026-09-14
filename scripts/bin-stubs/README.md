# bin-stubs

O `yellowlabtools` depende de `imagemin-optipng`, `imagemin-jpegtran` e `imagemin-jpegoptim`, que puxam `optipng-bin`, `jpegtran-bin` e `jpegoptim-bin`. Esses pacotes só têm binário pronto para Linux x86/x64: em máquinas **arm64** (Mac com Apple Silicon rodando Docker, Linux ARM) eles tentam compilar o código-fonte no `npm install`, e a compilação falha, derrubando o `docker compose up --build`.

Via `overrides` no `backend/package.json`, esses três pacotes são trocados pelos stubs desta pasta, que só exportam o caminho do binário do sistema. No Docker, os binários vêm do apt (`optipng`, `libjpeg-turbo-progs`, `jpegoptim`), então funciona igual em amd64 e arm64.

O `jpegoptim` 1.4.x do Debian bookworm tem um bug: com `--stdin` ele ainda exige um argumento de arquivo. Por isso o stub `jpegoptim-bin` aponta para o wrapper `jpegoptim-bin/jpegoptim`, que acrescenta `-` quando há `--stdin`.
