function crc16pix(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id, v) { return `${id}${String(v.length).padStart(2,'0')}${v}`; }

function limpar(s, n) {
  return (s||'').slice(0,n).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9 ]/g,' ').trim();
}

export function gerarPixEMV({ chave, nome, cidade, valor = 0 }) {
  const merchantName = limpar(nome || 'Personal', 25);
  const merchantCity = limpar(cidade || 'Brasil', 15);
  const valorStr = valor > 0 ? valor.toFixed(2) : null;
  const merchantAcct = tlv('26', tlv('00','BR.GOV.BCB.PIX') + tlv('01', chave));
  let emv = tlv('00','01') + merchantAcct + tlv('52','0000') + tlv('53','986')
    + (valorStr ? tlv('54',valorStr) : '') + tlv('58','BR')
    + tlv('59',merchantName) + tlv('60',merchantCity) + tlv('62',tlv('05','***')) + '6304';
  return emv + crc16pix(emv);
}
