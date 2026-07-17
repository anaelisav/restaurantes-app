// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'restaurantes_data';

function carregar() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function salvar(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// ── State ─────────────────────────────────────────────────────────────────────

let restaurantes = [];
let filtroStatus = 'todos';
let busca = '';
let editandoId = null;
let adicionandoVisitaId = null;
let editandoVisitaInfo = null; // { restauranteId, visitaIdx }
let estrelasSelecionadas = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function estrelas(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function formatarData(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function snackbar(msg, cor = '#27ae60') {
  const el = document.getElementById('snackbar');
  el.textContent = msg;
  el.style.background = cor;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Render ────────────────────────────────────────────────────────────────────

function filtrar() {
  return restaurantes
    .filter(r => {
      if (filtroStatus === 'fui' && !r.fui) return false;
      if (filtroStatus === 'quero' && r.fui) return false;
      const q = busca.toLowerCase();
      if (!q) return true;
      return (
        r.nome.toLowerCase().includes(q) ||
        r.bairro.toLowerCase().includes(q) ||
        r.culinaria.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function renderLista() {
  const lista = filtrar();
  const container = document.getElementById('lista-restaurantes');
  const contador = document.getElementById('contador');

  contador.textContent = lista.length === 1
    ? '1 restaurante'
    : `${lista.length} restaurantes`;

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🍽️</span>
        Nenhum restaurante encontrado.<br>Toque em <strong>+</strong> para adicionar.
      </div>`;
    return;
  }

  container.innerHTML = lista.map(r => {
    const aberto = document.getElementById(`body-${r.id}`)?.classList.contains('open');
    return `
    <div class="card" id="card-${r.id}">
      <div class="card-header" onclick="toggleCard('${r.id}')">
        <div class="card-info">
          <div class="card-nome">${escHtml(r.nome)}</div>
          <div class="card-meta">
            ${r.bairro ? `<span class="tag tag-bairro">📍 ${escHtml(r.bairro)}</span>` : ''}
            ${r.culinaria ? `<span class="tag tag-culinaria">🍴 ${escHtml(r.culinaria)}</span>` : ''}
            <span class="${r.fui ? 'badge-fui' : 'badge-quero'}">${r.fui ? '✓ Já fui' : '♡ Quero ir'}</span>
          </div>
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-icon" onclick="abrirEditar('${r.id}')" title="Editar">✏️</button>
          <button class="btn btn-icon" onclick="confirmarExcluir('${r.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="card-body ${aberto ? 'open' : ''}" id="body-${r.id}">
        <div class="card-body-inner">
          ${r.fui ? `
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span class="visitas-titulo">Visitas (${(r.visitas||[]).length})</span>
                <button class="btn btn-primary btn-sm" onclick="abrirAdicionarVisita('${r.id}')">+ Adicionar visita</button>
              </div>
              ${(r.visitas || []).length === 0
                ? `<p style="color:var(--text-muted);font-size:14px;">Nenhuma visita registrada ainda.</p>`
                : (r.visitas || []).map((v, idx) => `
                  <div class="visita-card">
                    <div class="visita-header">
                      <span class="visita-data">${v.data ? formatarData(v.data) : 'Data não informada'}</span>
                      <div style="display:flex;gap:6px;align-items:center;">
                        <span class="visita-estrelas">${v.estrelas ? estrelas(v.estrelas) : ''}</span>
                        <button class="btn btn-icon btn-sm" style="font-size:14px;" onclick="abrirEditarVisita('${r.id}',${idx})">✏️</button>
                        <button class="btn btn-icon btn-sm" style="font-size:14px;" onclick="excluirVisita('${r.id}',${idx})">🗑️</button>
                      </div>
                    </div>
                    ${v.pratos ? `<div class="visita-linha"><strong>Pratos:</strong> ${escHtml(v.pratos)}</div>` : ''}
                    ${v.drinks ? `<div class="visita-linha"><strong>Drinks:</strong> ${escHtml(v.drinks)}</div>` : ''}
                    ${v.comentario ? `<div class="visita-comentario">${escHtml(v.comentario)}</div>` : ''}
                  </div>`).join('')
              }
            </div>
          ` : `
            <div>
              <button class="btn btn-primary" style="width:100%;" onclick="marcarFui('${r.id}')">
                ✓ Marcar como visitado e adicionar visita
              </button>
            </div>
          `}
        </div>
      </div>
    </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Card toggle ───────────────────────────────────────────────────────────────

function toggleCard(id) {
  const body = document.getElementById(`body-${id}`);
  if (body) body.classList.toggle('open');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function abrirModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// ── Restaurante: adicionar / editar ───────────────────────────────────────────

function abrirAdicionar() {
  editandoId = null;
  document.getElementById('modal-titulo').textContent = 'Novo Restaurante';
  document.getElementById('form-restaurante').reset();
  abrirModal('modal-restaurante');
}

function abrirEditar(id) {
  const r = restaurantes.find(x => x.id === id);
  if (!r) return;
  editandoId = id;
  document.getElementById('modal-titulo').textContent = 'Editar Restaurante';
  document.getElementById('input-nome').value = r.nome;
  document.getElementById('input-bairro').value = r.bairro || '';
  document.getElementById('input-culinaria').value = r.culinaria || '';
  document.getElementById('input-fui').value = r.fui ? 'sim' : 'nao';
  abrirModal('modal-restaurante');
}

function salvarRestaurante(e) {
  e.preventDefault();
  const nome = document.getElementById('input-nome').value.trim();
  if (!nome) return;

  const dados = {
    nome,
    bairro: document.getElementById('input-bairro').value.trim(),
    culinaria: document.getElementById('input-culinaria').value.trim(),
    fui: document.getElementById('input-fui').value === 'sim',
  };

  if (editandoId) {
    const idx = restaurantes.findIndex(r => r.id === editandoId);
    restaurantes[idx] = { ...restaurantes[idx], ...dados };
    snackbar('Restaurante atualizado!');
  } else {
    restaurantes.push({ id: gerarId(), visitas: [], ...dados });
    snackbar('Restaurante adicionado!');
  }

  salvar(restaurantes);
  fecharModal('modal-restaurante');
  renderLista();
}

function confirmarExcluir(id) {
  const r = restaurantes.find(x => x.id === id);
  if (!r) return;
  if (confirm(`Excluir "${r.nome}"? Esta ação não pode ser desfeita.`)) {
    restaurantes = restaurantes.filter(x => x.id !== id);
    salvar(restaurantes);
    renderLista();
    snackbar('Restaurante excluído.', '#c0392b');
  }
}

function marcarFui(id) {
  const idx = restaurantes.findIndex(r => r.id === id);
  if (idx === -1) return;
  restaurantes[idx].fui = true;
  salvar(restaurantes);
  renderLista();
  setTimeout(() => abrirAdicionarVisita(id), 100);
}

// ── Visita: adicionar / editar ────────────────────────────────────────────────

function abrirAdicionarVisita(id) {
  adicionandoVisitaId = id;
  editandoVisitaInfo = null;
  document.getElementById('modal-visita-titulo').textContent = 'Nova Visita';
  document.getElementById('form-visita').reset();
  setEstrelas(0);
  abrirModal('modal-visita');
  // Abrir o card para ver a visita depois
  const body = document.getElementById(`body-${id}`);
  if (body) body.classList.add('open');
}

function abrirEditarVisita(restauranteId, visitaIdx) {
  const r = restaurantes.find(x => x.id === restauranteId);
  if (!r) return;
  const v = r.visitas[visitaIdx];
  if (!v) return;

  adicionandoVisitaId = restauranteId;
  editandoVisitaInfo = { restauranteId, visitaIdx };

  document.getElementById('modal-visita-titulo').textContent = 'Editar Visita';
  document.getElementById('input-visita-data').value = v.data || '';
  document.getElementById('input-visita-pratos').value = v.pratos || '';
  document.getElementById('input-visita-drinks').value = v.drinks || '';
  document.getElementById('input-visita-comentario').value = v.comentario || '';
  setEstrelas(v.estrelas || 0);
  abrirModal('modal-visita');
}

function salvarVisita(e) {
  e.preventDefault();
  const visita = {
    data: document.getElementById('input-visita-data').value,
    pratos: document.getElementById('input-visita-pratos').value.trim(),
    drinks: document.getElementById('input-visita-drinks').value.trim(),
    comentario: document.getElementById('input-visita-comentario').value.trim(),
    estrelas: estrelasSelecionadas,
  };

  if (editandoVisitaInfo) {
    const { restauranteId, visitaIdx } = editandoVisitaInfo;
    const idx = restaurantes.findIndex(r => r.id === restauranteId);
    restaurantes[idx].visitas[visitaIdx] = visita;
    snackbar('Visita atualizada!');
  } else {
    const idx = restaurantes.findIndex(r => r.id === adicionandoVisitaId);
    if (!restaurantes[idx].visitas) restaurantes[idx].visitas = [];
    restaurantes[idx].visitas.unshift(visita);
    snackbar('Visita adicionada!');
  }

  salvar(restaurantes);
  fecharModal('modal-visita');
  renderLista();
}

function excluirVisita(restauranteId, visitaIdx) {
  if (!confirm('Excluir esta visita?')) return;
  const idx = restaurantes.findIndex(r => r.id === restauranteId);
  restaurantes[idx].visitas.splice(visitaIdx, 1);
  salvar(restaurantes);
  renderLista();
  const body = document.getElementById(`body-${restauranteId}`);
  if (body) body.classList.add('open');
  snackbar('Visita excluída.', '#c0392b');
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function setEstrelas(n) {
  estrelasSelecionadas = n;
  document.querySelectorAll('.star-input span').forEach((el, i) => {
    el.classList.toggle('ativa', i < n);
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────

function setFiltro(status) {
  filtroStatus = status;
  document.querySelectorAll('.filter-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.filtro === status);
  });
  renderLista();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Carregar dados após DOM pronto (necessário para iOS PWA)
  restaurantes = carregar();

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  // Busca
  document.getElementById('busca').addEventListener('input', e => {
    busca = e.target.value;
    renderLista();
  });

  // Filtros
  document.querySelectorAll('.filter-chip').forEach(el => {
    el.addEventListener('click', () => setFiltro(el.dataset.filtro));
  });

  // Form restaurante
  document.getElementById('form-restaurante').addEventListener('submit', salvarRestaurante);

  // Form visita
  document.getElementById('form-visita').addEventListener('submit', salvarVisita);

  // Estrelas
  document.querySelectorAll('.star-input span').forEach((el, i) => {
    el.addEventListener('click', () => setEstrelas(i + 1));
    el.addEventListener('mouseover', () => {
      document.querySelectorAll('.star-input span').forEach((s, j) => {
        s.classList.toggle('ativa', j <= i);
      });
    });
    el.addEventListener('mouseleave', () => setEstrelas(estrelasSelecionadas));
  });

  // Fechar modais ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharModal(overlay.id);
    });
  });

  renderLista();
});
