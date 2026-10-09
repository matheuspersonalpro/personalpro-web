// PDF do relatório mensal que o personal envia PARA O ALUNO.
//
// Segue o mesmo desenho dos outros PDFs do app (fundo branco, tipografia
// Helvetica, margem via @page) porque este documento é impresso e reenviado —
// o layout escuro da tela viraria uma folha preta na impressora e ilegível no
// visualizador de PDF de quem abre no WhatsApp.
//
// O QUE ESTE ARQUIVO NÃO FAZ: nenhuma conta. Todo número chega pronto de
// `relatorioMensalAluno`, que por sua vez calcula em `functions/relatorioRegras`.
// Aqui só se desenha. Espalhar aritmética entre servidor e tela é como duas
// fontes de verdade discordam sem ninguém perceber.
// Porte de utils/pdfRelatorioMensal.js do app: o HTML é o MESMO (fundo branco, pensado pra imprimir);
// aqui o PDF sai pelo diálogo de impressão do navegador ("Salvar como PDF").
function escapeHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const AZUL = '#1D4ED8';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// 'AAAA-MM' → 'agosto de 2026'. Escrito por extenso porque a folha é lida por
// gente, e "2026-08" no cabeçalho de um documento pessoal parece exportação de
// planilha.
export function mesPorExtenso(anoMes) {
  const [ano, mes] = String(anoMes || '').split('-');
  const i = Number(mes) - 1;
  return MESES[i] ? `${MESES[i]} de ${ano}` : String(anoMes || '');
}

// 'AAAA-MM-DD' → 'jan/25'. Exportado pra reutilizar na tela sem repetir a lógica.
export function isoParaMesAno(iso) {
  const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? MESES[Number(m[2]) - 1] + '/' + m[1].slice(2) : '';
}

// Rótulo das modalidades. O dado guarda a chave crua ('musculacao'), que não
// pode aparecer assim num documento que vai pro aluno.
const LABEL_MODALIDADE = {
  musculacao: 'Musculação',
  presencial: 'Treino presencial',
  corrida:    'Corrida',
  ciclismo:   'Ciclismo',
};

// Número no formato brasileiro, sem casa decimal inútil: 52 e não 52,00; mas
// 62,5 continua 62,5.
function kg(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',')) + ' kg';
}

function sinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '';
  return v > 0 ? '+' : '−';
}

function abs(n) {
  const v = Math.abs(Number(n));
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

/**
 * Monta o HTML do relatório.
 *
 * `dados` vem da função `relatorioMensalAluno`; `texto` é a abertura escrita
 * pelo modelo e é OPCIONAL de propósito — quando o Gemini falha, a função
 * devolve os números sem texto, e o relatório sai assim mesmo. Uma folha com os
 * números certos e sem abertura vale muito mais que nenhuma folha.
 */
export function htmlRelatorioMensal({ aluno, personal, dados, texto }) {
  const { anoMes, frequencia, progressao, avaliacoes } = dados || {};

  const modalidades = Object.entries(frequencia?.contagem || {})
    .map(([mod, n]) => `<tr><td>${escapeHtml(LABEL_MODALIDADE[mod] || mod)}</td><td>${n}x</td></tr>`)
    .join('');

  // Só exercício com mais de um registro entra: com um dia só não há evolução
  // pra mostrar, e a linha "40 kg → 40 kg" faria o aluno achar que travou logo
  // no exercício que ele fez uma vez só.
  const comEvolucao = (progressao || []).filter(x => x.sessoes > 1);

  const linhasCarga = comEvolucao.map(x => {
    // Parado = mesma carga desde sempre → âmbar. Queda → vermelho. Subiu → verde.
    const cor = x.parado ? '#b45309' : x.variacao > 0 ? '#166534' : x.variacao < 0 ? '#b91c1c' : '#64748b';
    const delta = x.parado
      ? 'mesma carga'
      : `${sinal(x.variacao)}${abs(x.variacao)} kg · ${sinal(x.variacaoPct)}${abs(x.variacaoPct)}%`;
    const periodo = (x.primeiraData && x.ultimaData)
      ? `<br><span style="font-size:10px;color:#94a3b8">${escapeHtml(isoParaMesAno(x.primeiraData))} → ${escapeHtml(isoParaMesAno(x.ultimaData))} · ${x.sessoes} sessões</span>`
      : '';
    const avisoParado = !x.parado && x.diasParado != null && x.diasParado > 21
      ? `<br><span style="font-size:10px;color:#b45309">última vez há ${x.diasParado} dias</span>`
      : '';
    return `<tr>
      <td>${escapeHtml(x.exercicio)}${periodo}${avisoParado}</td>
      <td style="text-align:center;color:#64748b">${kg(x.primeira)}</td>
      <td style="text-align:center">${kg(x.atual)}</td>
      <td style="text-align:right;color:${cor};font-weight:700">${escapeHtml(delta)}</td>
    </tr>`;
  }).join('');

  const linhasAvaliacao = (avaliacoes?.linhas || []).map(l => {
    // Em gordura corporal, cair é melhorar. Pintar toda queda de vermelho
    // diria ao aluno que ele piorou justamente onde ele mais evoluiu.
    const menosEhMelhor = /gordura/i.test(l.rotulo);
    const bom = menosEhMelhor ? l.variacao < 0 : l.variacao > 0;
    const cor = l.variacao === 0 ? '#64748b' : bom ? '#166534' : '#b91c1c';
    return `<tr>
      <td>${escapeHtml(l.rotulo)}</td>
      <td style="text-align:center;color:#64748b">${escapeHtml(String(l.antes).replace('.', ','))}${escapeHtml(l.unidade)}</td>
      <td style="text-align:center">${escapeHtml(String(l.depois).replace('.', ','))}${escapeHtml(l.unidade)}</td>
      <td style="text-align:right;color:${cor};font-weight:700">${sinal(l.variacao)}${abs(l.variacao)}${escapeHtml(l.unidade)}</td>
    </tr>`;
  }).join('');

  // A abertura escrita pelo modelo vira parágrafos. `escapeHtml` antes de
  // trocar as quebras por <p>: sem isso, um "<" no texto quebraria a folha.
  const abertura = String(texto || '').trim()
    ? escapeHtml(texto.trim()).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page{margin:20mm 16mm 16mm}
body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:13px;line-height:1.5}
h1{font-size:20px;color:#0F172A;margin:0 0 4px;font-weight:700}
.sub{font-size:11.5px;color:#64748b;margin:0 0 22px}
h3{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#0F172A;font-weight:700;
   margin:26px 0 11px;padding-left:10px;border-left:3px solid ${AZUL};
   break-after:avoid;page-break-after:avoid}
p{margin:0 0 10px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;
   font-weight:600;text-align:left;padding:0 4px 5px}
td{padding:6px 4px;border-bottom:1px solid #f1f5f9;color:#334155}
.total{font-size:26px;font-weight:700;color:#0F172A;line-height:1.1}
.total small{font-size:12px;font-weight:400;color:#64748b}
.footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;
        font-size:9px;color:#94a3b8;text-align:center}
</style></head><body>

<h1>Relatório de evolução</h1>
<p class="sub">${escapeHtml(aluno || '')} · ${escapeHtml(mesPorExtenso(anoMes))}</p>

${abertura}

<h3>Frequência do mês</h3>
<p class="total">${frequencia?.total ?? 0} <small>atividade${(frequencia?.total ?? 0) === 1 ? '' : 's'}${frequencia?.mediaXSemana != null && (frequencia?.total ?? 0) > 0 ? ` · média ${frequencia.mediaXSemana}×/sem` : ''}</small></p>
${modalidades ? `<table>${modalidades}</table>` : ''}

${comEvolucao.length ? `
<h3>Evolução de carga</h3>
<table>
  <tr><th>Exercício</th><th style="text-align:center">Início</th><th style="text-align:center">Agora</th><th style="text-align:right">Diferença</th></tr>
  ${linhasCarga}
</table>` : ''}

${linhasAvaliacao ? `
<h3>Avaliação física</h3>
<table>
  <tr><th>Medida</th><th style="text-align:center">Antes</th><th style="text-align:center">Agora</th><th style="text-align:right">Diferença</th></tr>
  ${linhasAvaliacao}
</table>` : ''}

<div class="footer">${escapeHtml(personal || '')} · Relatório gerado pelo Personal Pro</div>
</body></html>`;
}

/** Abre o relatório numa aba nova e chama a impressão (Salvar como PDF). */
export function abrirRelatorioParaImprimir({ aluno, personal, dados, texto }) {
  const html = htmlRelatorioMensal({ aluno, personal, dados, texto });
  const w = window.open('', '_blank');
  if (!w) throw new Error('O navegador bloqueou a nova aba. Libere pop-ups para este site e tente de novo.');
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = `Evolução ${String(aluno || 'aluno').trim().split(/s+/)[0]} - ${mesPorExtenso(dados?.anoMes)}`;
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* o usuário imprime pelo menu */ } }, 500);
}
