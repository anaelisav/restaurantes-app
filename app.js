// ── Firebase ──────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCG6S_ZxU8r7Sw0VPqCaNXw1yDFBa3ZQ8",
  authDomain: "restaurantes-app-e48c3.firebaseapp.com",
  projectId: "restaurantes-app-e48c3",
  storageBucket: "restaurantes-app-e48c3.firebasestorage.app",
  messagingSenderId: "821868748137",
  appId: "1:821868748137:web:a76310dc56a6fbb71131f8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colecao = collection(db, "restaurantes");

// ── State ─────────────────────────────────────────────────────────────────────

let restaurantes = [];
let filtroStatus = 'todos';
let busca = '';
let editandoId = null;
let adicionandoVisitaId = null;
let editandoVisitaInfo = null;
let estrelasSelecionadas = 0;

// ── Firestore ─────────────────────────────────────────────────────────────────

function escutarDados() {
  onSnapshot(colecao, snapshot => {
    restaurantes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLista();
  });
}

async function salvarRestauranteDB(r) {
  const { id, ...dados } = r;
  await setDoc(doc(db, "restaurantes", id), dados);
}

async function excluirRestauranteDB(id) {
  await deleteDoc(doc(db, "restaurantes", id));
}

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

async function salvarRestaurante(e) {
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
    const r = restaurantes.find(x => x.id === editandoId);
    await salvarRestauranteDB({ ...r, ...dados });
    snackbar('Restaurante atualizado!');
  } else {
    const novo = { id: gerarId(), visitas: [], ...dados };
    await salvarRestauranteDB(novo);
    snackbar('Restaurante adicionado!');
  }

  fecharModal('modal-restaurante');
}

async function confirmarExcluir(id) {
  const r = restaurantes.find(x => x.id === id);
  if (!r) return;
  if (confirm(`Excluir "${r.nome}"? Esta ação não pode ser desfeita.`)) {
    await excluirRestauranteDB(id);
    snackbar('Restaurante excluído.', '#c0392b');
  }
}

async function marcarFui(id) {
  const r = restaurantes.find(x => x.id === id);
  if (!r) return;
  await salvarRestauranteDB({ ...r, fui: true });
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

async function salvarVisita(e) {
  e.preventDefault();
  const visita = {
    data: document.getElementById('input-visita-data').value,
    pratos: document.getElementById('input-visita-pratos').value.trim(),
    drinks: document.getElementById('input-visita-drinks').value.trim(),
    comentario: document.getElementById('input-visita-comentario').value.trim(),
    estrelas: estrelasSelecionadas,
  };

  const r = restaurantes.find(x => x.id === adicionandoVisitaId);
  if (!r) return;

  const visitas = [...(r.visitas || [])];

  if (editandoVisitaInfo) {
    visitas[editandoVisitaInfo.visitaIdx] = visita;
    snackbar('Visita atualizada!');
  } else {
    visitas.unshift(visita);
    snackbar('Visita adicionada!');
  }

  await salvarRestauranteDB({ ...r, visitas });
  fecharModal('modal-visita');
}

async function excluirVisita(restauranteId, visitaIdx) {
  if (!confirm('Excluir esta visita?')) return;
  const r = restaurantes.find(x => x.id === restauranteId);
  if (!r) return;
  const visitas = [...(r.visitas || [])];
  visitas.splice(visitaIdx, 1);
  await salvarRestauranteDB({ ...r, visitas });
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

// ── Expose globals (needed for inline onclick handlers) ───────────────────────

window.toggleCard = toggleCard;
window.abrirEditar = abrirEditar;
window.confirmarExcluir = confirmarExcluir;
window.abrirAdicionarVisita = abrirAdicionarVisita;
window.abrirEditarVisita = abrirEditarVisita;
window.excluirVisita = excluirVisita;
window.marcarFui = marcarFui;
window.abrirAdicionar = abrirAdicionar;
window.fecharModal = fecharModal;
window.setFiltro = setFiltro;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  document.getElementById('busca').addEventListener('input', e => {
    busca = e.target.value;
    renderLista();
  });

  document.querySelectorAll('.filter-chip').forEach(el => {
    el.addEventListener('click', () => setFiltro(el.dataset.filtro));
  });

  document.getElementById('form-restaurante').addEventListener('submit', salvarRestaurante);
  document.getElementById('form-visita').addEventListener('submit', salvarVisita);

  document.querySelectorAll('.star-input span').forEach((el, i) => {
    el.addEventListener('click', () => setEstrelas(i + 1));
    el.addEventListener('mouseover', () => {
      document.querySelectorAll('.star-input span').forEach((s, j) => {
        s.classList.toggle('ativa', j <= i);
      });
    });
    el.addEventListener('mouseleave', () => setEstrelas(estrelasSelecionadas));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharModal(overlay.id);
    });
  });

  escutarDados();
});
