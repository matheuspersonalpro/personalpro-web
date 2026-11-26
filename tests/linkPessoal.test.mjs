// node --test: o link pessoal (#t=) e o link do personal (?codigo=) sem o app
// vão pro formulário web.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { destinoLinkPessoal, scriptEncaminharLinkPessoal, formularioDoCodigo, ENTRAR_WEB } from '../lib/linkPessoal.js';

const TOKEN = 'a'.repeat(21) + '_-' + 'B9'.repeat(10);

test('#t= vai pro formulário com a query e o fragmento', () => {
  assert.equal(destinoLinkPessoal('', `#t=${TOKEN}`), `${ENTRAR_WEB}#t=${TOKEN}`);
  assert.equal(destinoLinkPessoal('?servico=online', `#t=${TOKEN}`), `${ENTRAR_WEB}?servico=online#t=${TOKEN}`);
});

test('?codigo= vai pro formulário com o servico junto', () => {
  assert.equal(destinoLinkPessoal('?codigo=TEST', ''), `${ENTRAR_WEB}?codigo=TEST`);
  assert.equal(destinoLinkPessoal('?codigo=TEST&servico=online', ''), `${ENTRAR_WEB}?codigo=TEST&servico=online`);
  assert.equal(destinoLinkPessoal('?codigo=abc123&servico=presencial', ''), `${ENTRAR_WEB}?codigo=abc123&servico=presencial`);
  assert.equal(destinoLinkPessoal('?codigo=ABC-123', ''), `${ENTRAR_WEB}?codigo=ABC-123`);
});

test('outros links ficam na página do convite', () => {
  for (const [s, h] of [['?codigo=ABC123&app=1', ''], ['?codigo=AB', ''], ['?codigo=%3Cx%3E', ''], ['?codigo=', ''], ['?relogio=K7M4Q2', ''], ['', '#time=abc'], ['', ''], ['', '#t='], ['', '#t=<script>']]) {
    assert.equal(destinoLinkPessoal(s, h), null, `${s}${h}`);
  }
});

test('botão do formulário na página do código tira o app=1', () => {
  assert.equal(formularioDoCodigo('?codigo=TEST&servico=online&app=1'), `${ENTRAR_WEB}?codigo=TEST&servico=online`);
  assert.equal(formularioDoCodigo('?codigo=TEST&app=1'), `${ENTRAR_WEB}?codigo=TEST`);
});

function rodar(search, hash) {
  let destino = null;
  const location = { search, hash, replace: (u) => { destino = u; } };
  vm.runInNewContext(scriptEncaminharLinkPessoal(), { location, URLSearchParams });
  return destino;
}

test('script inline faz o mesmo que a função', () => {
  const casos = [['', `#t=${TOKEN}`], ['?servico=online', `#t=${TOKEN}`], ['?codigo=TEST', ''], ['?codigo=TEST&servico=online', ''],
    ['?codigo=ab 12', ''], ['?codigo=ABC123&app=1', ''], ['?codigo=AB', ''], ['?relogio=K7M4Q2', ''], ['', '#time=abc'], ['', '#t=%3Cx%3E'], ['', '']];
  for (const [s, h] of casos) assert.equal(rodar(s, h), destinoLinkPessoal(s, h), `${s}${h}`);
  assert.equal(rodar('?codigo=TEST&servico=online', ''), `${ENTRAR_WEB}?codigo=TEST&servico=online`);
});
