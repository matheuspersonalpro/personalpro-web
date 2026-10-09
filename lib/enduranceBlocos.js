// Blocos de endurance (aquecimento/série/recuperação) entre o formato SALVO
// (`estrutura[]`, valores em metros/segundos) e o do EDITOR (texto em km/min).
//
// Saíram do EndurancePlanner porque a ida e volta corrompia sessões: tempo
// virava minuto inteiro (30s → 60s, 15s → nada) e a `obs` do bloco sumia --
// abrir e salvar sem mexer já estragava os modelos de 30s/15s. Ver
// __tests__/enduranceBlocos.test.js.

const novoBlocoId = () => Math.random().toString(36).slice(2);

/** Valor salvo (m ou s) → texto do editor (km ou min, vírgula decimal). */
export function valorTxtDe(medida, valor) {
  if (valor == null) return '';
  const n = medida === 'distancia' ? valor / 1000 : valor / 60;
  // Até 3 casas: 15s = "0,25" min; 21097m = "21,097" km.
  return String(+n.toFixed(3)).replace('.', ',');
}

/** Texto do editor (km ou min) → valor salvo (m ou s), ou null. */
export function valorDoTexto(medida, valorTxt) {
  const n = parseFloat(String(valorTxt).replace(',', '.'));
  if (!isFinite(n) || n <= 0) return null;
  return medida === 'distancia' ? Math.round(n * 1000) : Math.round(n * 60);
}

/** `estrutura[]` salva → blocosExtra do editor. */
export function estruturaParaBlocosExtra(estrutura) {
  if (!Array.isArray(estrutura)) return [];
  return estrutura.map(b => ({
    id: b.id || novoBlocoId(), bloco: b.bloco || 'intervalo', repeticoes: b.repeticoes || '',
    medida: b.medida, valorTxt: valorTxtDe(b.medida, b.valor), zona: b.zona,
    recMedida: b.recuperacao?.medida || 'tempo', recValorTxt: valorTxtDe(b.recuperacao?.medida, b.recuperacao?.valor), recZona: b.recuperacao?.zona || 'Z1',
    obs: b.obs || '',
  }));
}

/** blocosExtra do editor → `estrutura[]` pra salvar (sem undefined). */
export function blocosExtraParaEstrutura(blocosExtra) {
  return (blocosExtra || []).map(b => ({
    id: b.id, bloco: b.bloco, repeticoes: b.repeticoes ? Number(b.repeticoes) : null,
    medida: b.medida ?? null, valor: valorDoTexto(b.medida, b.valorTxt), zona: b.zona ?? null,
    recuperacao: (b.bloco === 'intervalo' && b.recValorTxt)
      ? { medida: b.recMedida, valor: valorDoTexto(b.recMedida, b.recValorTxt), zona: b.recZona || null }
      : null,
    obs: b.obs || '',
  }));
}
