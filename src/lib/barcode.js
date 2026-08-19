const bwipjs = require('bwip-js');

async function generateBarcodePng(code) {
  return bwipjs.toBuffer({
    bcid: 'qrcode',
    text: code,
    scale: 6,
  });
}

function generateCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KASKU-${random}`;
}

module.exports = { generateBarcodePng, generateCode };
