// ===== Elementos =====
const playerTagInput = document.getElementById('playerTag');
const fetchButton = document.getElementById('fetchButton');
const loadingElement = document.getElementById('loading');
const outputElement = document.getElementById('output');
const resultContainer = document.querySelector('.result-container');

const API_URL = "http://localhost:3000/player/"; // backend local (proxy)

// ===== Botão de Busca =====
fetchButton.addEventListener('click', handleSearch);
playerTagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
  let playerTag = playerTagInput.value.trim();
  if (playerTag && !playerTag.startsWith('#')) {
    playerTag = '#' + playerTag;
    playerTagInput.value = playerTag;
  }
  if (!playerTag || !playerTag.startsWith('#')) {
    showError('Digite uma tag válida iniciando com #');
    return;
  }
  fetchAll(playerTag.replace('#', ''));
}

// ===== Função principal =====
async function fetchAll(cleanTag) {
  loadingElement.classList.remove('escondido');
  outputElement.classList.add('escondido');
  resultContainer.innerHTML = '';

  try {
    const [playerResp, logResp] = await Promise.all([
      fetch(`${API_URL}${cleanTag}`),
      fetch(`${API_URL}${cleanTag}/battlelog`)
    ]);

    if (!playerResp.ok) throw new Error('Não foi possível buscar o jogador');
    const player = await playerResp.json();

    let battlelog = [];
    if (logResp.ok) battlelog = await logResp.json();

    displayAll(player, battlelog);
  } catch (err) {
    showError('Erro ao buscar dados.');
  } finally {
    loadingElement.classList.add('escondido');
  }
}

// ===== Renderização =====
function displayAll(player, battlelog) {
  if (player.reason) {
    showError(player.message || 'Erro inesperado.');
    return;
  }

  const cardById = {};
  (player.cards || []).forEach(c => cardById[c.id] = c);

  // ===== Cabeçalho do jogador =====
  const header = document.createElement('div');
  header.className = 'player-card';
  const winrate = (player.wins + player.losses) > 0
    ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1) + '%'
    : '-';
  header.innerHTML = `
    <div class="player-header">
      <div class="player-title">
        <h2><i class="fas fa-user"></i> ${player.name} <span class="tag">(${player.tag})</span></h2>
        <p class="arena"><i class="fas fa-chess-rook"></i> ${player.arena?.name || '—'}</p>
      </div>
      <div class="trophy-box">
        <i class="fas fa-trophy"></i>
        <div>
          <div class="trophy-now">${player.trophies ?? 0}</div>
          <div class="trophy-best">Recorde: ${player.bestTrophies ?? 0}</div>
        </div>
      </div>
    </div>
    <div class="player-stats">
      <div class="stat"><h3>Nível Rei</h3><p>${player.expLevel ?? '-'}</p></div>
      <div class="stat"><h3>Vitórias</h3><p>${player.wins ?? 0}</p></div>
      <div class="stat"><h3>Derrotas</h3><p>${player.losses ?? 0}</p></div>
      <div class="stat"><h3>Winrate</h3><p>${winrate}</p></div>
      <div class="stat"><h3>3 Coroas</h3><p>${player.threeCrownWins ?? 0}</p></div>
      <div class="stat"><h3>Batalhas</h3><p>${player.battleCount ?? 0}</p></div>
      <div class="stat"><h3>Doações Feitas</h3><p>${player.totalDonations ?? 0}</p></div>
      <div class="stat"><h3>Cartas Possuídas</h3><p>${player.cards?.length ?? 0}</p></div>
    </div>
  `;
  resultContainer.appendChild(header);

  // ===== Liga / Modo Ranqueado =====
  if (player.leagueStatistics) {
    const ls = player.leagueStatistics;
    const league = document.createElement('div');
    league.className = 'season-info';
    league.innerHTML = `
      <h3><i class="fas fa-medal"></i> Liga Ranqueada</h3>
      <div class="player-stats">
        <div class="stat"><h3>Temporada Atual</h3><p>${ls.currentSeason?.trophies ?? '-'}</p></div>
        <div class="stat"><h3>Anterior (melhor)</h3><p>${ls.previousSeason?.bestTrophies ?? '-'}</p></div>
        <div class="stat"><h3>Melhor de Todas</h3><p>${ls.bestSeason?.trophies ?? '-'}</p></div>
      </div>
    `;
    resultContainer.appendChild(league);
  }

  // ===== Desafios =====
  const challengeStats = document.createElement('div');
  challengeStats.className = 'season-info';
  challengeStats.innerHTML = `
    <h3><i class="fas fa-trophy"></i> Desafios</h3>
    <div class="player-stats">
      <div class="stat"><h3>Máx Vitórias em Desafio</h3><p>${player.challengeMaxWins ?? '-'}</p></div>
      <div class="stat"><h3>Cartas Ganhas em Desafios</h3><p>${player.challengeCardsWon ?? '-'}</p></div>
      <div class="stat"><h3>Batalhas de Torneio</h3><p>${player.tournamentBattleCount ?? '-'}</p></div>
    </div>
  `;
  resultContainer.appendChild(challengeStats);

  // ===== Deck Atual =====
  if (player.currentDeck?.length) {
    const deck = document.createElement('div');
    deck.className = 'deck-info';
    deck.innerHTML = `<h3><i class="fas fa-layer-group"></i> Deck Atual</h3><div class="deck-cards"></div>`;
    const deckGrid = deck.querySelector('.deck-cards');
    player.currentDeck.forEach(card => {
      deckGrid.appendChild(buildCardEl(cardById[card.id] || card));
    });
    resultContainer.appendChild(deck);
  }

  // ===== Cartas Evoluídas (estilo Clash Royale) =====
  const evoCards = (player.cards || []).filter(c => (c.evolutionLevel || c.levelEvolution || 0) > 0);
  if (evoCards.length) {
    const evoDiv = document.createElement('div');
    evoDiv.className = 'deck-info';
    evoDiv.innerHTML = `<h3><i class="fas fa-bolt"></i> Cartas Evoluídas</h3><div class="deck-cards"></div>`;
    const grid = evoDiv.querySelector('.deck-cards');
    evoCards.forEach(c => grid.appendChild(buildCardEl(c, true)));
    resultContainer.appendChild(evoDiv);
  }

  // ===== Todas as Cartas Desbloqueadas =====
  if (player.cards?.length) {
    const all = document.createElement('div');
    all.className = 'deck-info';
    all.innerHTML = `<h3><i class="fas fa-clone"></i> Coleção de Cartas</h3><div class="deck-cards"></div>`;
    const grid = all.querySelector('.deck-cards');
    player.cards.sort((a,b) => (displayLevel(b)-displayLevel(a)) || a.name.localeCompare(b.name))
      .forEach(c => grid.appendChild(buildCardEl(c)));
    resultContainer.appendChild(all);
  }

  // ===== Histórico de Batalhas =====
  if (Array.isArray(battlelog) && battlelog.length) {
    const log = document.createElement('div');
    log.className = 'deck-info';
    log.innerHTML = `<h3><i class="fas fa-history"></i> Histórico de Batalhas (10 mais recentes)</h3><div class="battle-list"></div>`;
    const list = log.querySelector('.battle-list');

    battlelog.slice(0,10).forEach(b => {
      const mode = b.gameMode?.name || '—';
      const teamCrowns = (b.team?.[0]?.crowns) ?? 0;
      const oppCrowns = (b.opponent?.[0]?.crowns) ?? 0;
      const result = teamCrowns > oppCrowns ? 'Vitória' : (teamCrowns < oppCrowns ? 'Derrota' : 'Empate');
      const when = formatBattleTime(b.battleTime);
      const teamCards = (b.team?.[0]?.cards || []).map(c => c.name).slice(0,8).join(', ');
      const oppCards  = (b.opponent?.[0]?.cards || []).map(c => c.name).slice(0,8).join(', ');

      const row = document.createElement('div');
      row.className = `battle-row ${result==='Vitória'?'win':(result==='Derrota'?'loss':'draw')}`;
      row.innerHTML = `
        <div class="battle-main">
          <span class="badge">${result}</span>
          <span class="mode">${mode}</span>
          <span class="crowns">${teamCrowns} - ${oppCrowns}</span>
          <span class="time">${when}</span>
        </div>
        <div class="battle-decks">
          <div><strong>Seu deck:</strong> ${teamCards||'—'}</div>
          <div><strong>Oponente:</strong> ${oppCards||'—'}</div>
        </div>
      `;
      list.appendChild(row);
    });
    resultContainer.appendChild(log);
  }

  outputElement.classList.remove('escondido');

  // ===== Helpers =====
  function displayLevel(card) {
    const maxLevel = card.maxLevel || 15;
    const rawLevel = card.level || 1;
    return clamp(rawLevel + (15 - maxLevel), 1, 15);
  }

  function buildCardEl(card, isEvo=false) {
    const imgSrc = card.iconUrls?.medium || card.iconUrls?.large || '';
    const lvl = displayLevel(card);
    const star = card.starLevel || 0;
    const evoLvl = card.evolutionLevel || card.levelEvolution || 0;
    const rarity = (card.rarity || '').toUpperCase();

    const el = document.createElement('div');
    el.className = 'card' + (isEvo?' evo-card':'');
    el.innerHTML = `
      <div class="card-art ${imgSrc?'':'no-art'}">
        ${imgSrc?`<img src="${imgSrc}" alt="${card.name||'Carta'}" loading="lazy"/>`:`<div class="img-placeholder"><i class="fas fa-image"></i></div>`}
        <span class="badge level">Nv ${lvl}</span>
        ${star?`<span class="badge star"><i class="fas fa-star"></i> ${star}</span>`:''}
        ${isEvo || evoLvl ? `<span class="badge evo"><i class="fas fa-bolt"></i> Evo ${evoLvl}</span>`:''}
      </div>
      <p class="card-name">${card.name||'Carta'}</p>
      <p class="card-meta">${rarity?rarity:''}</p>
    `;
    return el;
  }
}

// ===== Funções auxiliares =====
function showError(message){
  resultContainer.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
  outputElement.classList.remove('escondido');
}
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function formatBattleTime(s){
  try { const t = s.endsWith('Z')?s:s+'Z'; return new Date(t).toLocaleString(); }
  catch{return s;}
}
