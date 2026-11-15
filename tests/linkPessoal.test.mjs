// node --test: o link pessoal (#t=) sem o app vai pro formulário web.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { destinoLinkPessoal, scriptEncaminharLinkPessoal, ENTRAR_WEB } from '../lib/linkPessoal.js';

const TOKEN = 'a'.repeat(21) + '_-' + 'B9'.repeat(10);

test('#t= vai pro formulário com a query e o fragmento', () => {
  assert.equal(destinoLinkPessoal('', `#t=${TOKEN}`), `${ENTRAR_WEB}#t=${TOKEN}`);
  assert.equal(destinoLinkPessoal('?servico=online', `#t=${TOKEN}`), `${ENTRAR_WEB}?servico=online#t=${TOKEN}`);
});

test('outros links ficam na página do convite', () => {
  for (const [s, h] of [['?codigo=ABC123', ''], ['?relogio=K7M4Q2', ''], ['', '#time=abc'], ['', ''], ['', '#t='], ['', '#t=<script>']]) {
    assert.equal(destinoLinkPessoal(s, h), null, `${s}${h}`);
  }
});

function rodar(search, hash) {
  let destino = null;
  const location = { search, hash, replace: (u) => { destino = u; } };
  vm.runInNewContext(scriptEncaminharLinkPessoal(), { location, URLSearchParams });
  return destino;
}

test('script inline faz o mesmo que a função', () => {
  assert.equal(rodar('', `#t=${TOKEN}`), `${ENTRAR_WEB}#t=${TOKEN}`);
  assert.equal(rodar('?codigo=ABC123', ''), null);
  assert.equal(rodar('', '#time=abc'), null);
  assert.equal(rodar('', '#t=%3Cx%3E'), null);
});
