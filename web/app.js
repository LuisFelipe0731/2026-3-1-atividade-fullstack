const state = { posts: [], view: 'feed', token: localStorage.getItem('diatinf-token'), user: JSON.parse(localStorage.getItem('diatinf-user') || 'null') };
const postsElement = document.querySelector('#posts');
const statusElement = document.querySelector('#feed-status');

const api = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
  return data;
};

function initials(user) { return user?.initials || '??'; }
function avatar(user) { return `<span class="avatar ${user?.color === '#ce701b' ? 'avatar-orange' : user?.color === '#327f8f' ? 'avatar-teal' : user?.color === '#d45d4c' ? 'avatar-red' : 'avatar-blue'}">${initials(user)}</span>`; }
function syncCurrentUser() {
  const card = document.querySelector('#current-user-card');
  const composerAvatar = document.querySelector('#composer-avatar');
  const loginButton = document.querySelector('#login-open');
  if (state.user) {
    card.innerHTML = `${avatar(state.user)}<div><strong>${state.user.name}</strong><small>@${state.user.handle}</small></div>`;
    composerAvatar.className = `avatar ${state.user.color === '#ce701b' ? 'avatar-orange' : state.user.color === '#327f8f' ? 'avatar-teal' : state.user.color === '#d45d4c' ? 'avatar-red' : 'avatar-blue'}`;
    composerAvatar.textContent = state.user.initials;
    loginButton.textContent = state.user.name.split(' ')[0];
    document.querySelector('#post-content').placeholder = 'O que está acontecendo na DIATINF?';
  } else {
    card.innerHTML = '<span class="avatar avatar-blue">?</span><div><strong>Visitante</strong><small>Faça login para publicar</small></div>';
    composerAvatar.className = 'avatar avatar-blue';
    composerAvatar.textContent = '?';
    loginButton.textContent = 'Entrar';
    document.querySelector('#post-content').placeholder = 'Entre para publicar na DIATINF';
  }
}
function relativeTime(date) { const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000)); return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`; }
function postTemplate(post, index) {
  const comments = post.comments.map((comment) => `<div class="comment">${avatar(comment.user)}<p><strong>${comment.user.name}</strong> ${comment.content}</p></div>`).join('');
  return `<article class="post" style="animation-delay:${index * 70}ms"><div class="post-head"><a class="profile-link" href="#profile/${post.user.handle}" data-handle="${post.user.handle}" aria-label="Ver perfil de ${post.user.name}">${avatar(post.user)}</a><div class="post-user"><a class="profile-link" href="#profile/${post.user.handle}" data-handle="${post.user.handle}"><strong>${post.user.name}</strong><small>@${post.user.handle}</small></a></div><time class="post-time">${relativeTime(post.createdAt)}</time></div><p class="post-content">${post.content.replace(/</g, '&lt;')}</p><div class="post-actions"><button class="action-button comment-toggle" data-id="${post.id}">▢ ${post.comments.length} ${post.comments.length === 1 ? 'comentário' : 'comentários'}</button><button class="action-button rate-button" data-id="${post.id}">★ Avaliar</button><span class="rating">★ ${post.averageRating || '—'} <small>(${post.ratingCount})</small></span></div><div class="comments" id="comments-${post.id}">${comments}<form class="comment-form" data-id="${post.id}"><input maxlength="280" placeholder="Escreva um comentário..." aria-label="Comentário"><button type="submit">Enviar</button></form></div></article>`;
}
function currentProfile() { return state.user; }
function renderProfile(profileData = null) {
  const user = profileData?.user || currentProfile();
  const ownPosts = profileData?.posts || (user ? state.posts.filter((post) => post.user.handle === user.handle) : []);
  const profilePanel = document.querySelector('#profile-panel');
  if (!user) { profilePanel.innerHTML = '<div class="profile-empty"><h2>Seu perfil</h2><p>Entre para acessar seu perfil e acompanhar suas publicações.</p><button class="primary-button" id="profile-login">Entrar</button></div>'; document.querySelector('#profile-login').addEventListener('click', openLogin); return; }
  profilePanel.innerHTML = `<div class="profile-cover"></div><div class="profile-details">${avatar(user)}<div><h2>${user.name}</h2><p>@${user.handle}</p></div></div><p class="profile-bio">Membro da comunidade DIATINF X e apaixonado por compartilhar ideias.</p><div class="profile-stats"><strong>${ownPosts.length}<small>publicações</small></strong><strong>${ownPosts.reduce((total, post) => total + post.comments.length, 0)}<small>comentários recebidos</small></strong><strong>${ownPosts.reduce((total, post) => total + post.ratingCount, 0)}<small>avaliações</small></strong></div>`;
}
function renderPosts() { const visible = state.view === 'mine' ? state.posts.filter((post) => post.user.handle === currentProfile()?.handle) : state.posts; postsElement.innerHTML = visible.length ? visible.map(postTemplate).join('') : '<div class="post"><p>Nenhuma publicação encontrada ainda.</p></div>'; }
async function loadPosts(query = '') { statusElement.textContent = 'Atualizando feed...'; try { state.posts = await api(`/posts${query ? `?q=${encodeURIComponent(query)}` : ''}`); if (state.view !== 'profile') renderPosts(); statusElement.textContent = ''; } catch (error) { statusElement.textContent = error.message; } }
async function loadProfile(handle = '') { statusElement.textContent = 'Carregando perfil...'; try { const profile = await api(`/users/${encodeURIComponent(handle)}`); renderProfile(profile); statusElement.textContent = ''; } catch (error) { statusElement.textContent = error.message; document.querySelector('#profile-panel').innerHTML = '<div class="profile-empty"><h2>Perfil indisponível</h2><p>Não foi possível encontrar esse usuário.</p></div>'; } }
function setView(view, handle = '') { state.view = view; document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view)); const titles = { feed: 'Feed global', global: 'Feed global', mine: 'Meus posts', profile: handle ? `Perfil de @${handle}` : 'Meu perfil' }; document.querySelector('#view-title').textContent = titles[view] || titles.feed; document.querySelector('#composer').classList.toggle('hidden', view === 'profile'); document.querySelector('#profile-panel').classList.toggle('hidden', view !== 'profile'); document.querySelector('#posts').classList.toggle('hidden', view === 'profile'); if (view === 'mine' && !state.user) { openLogin(); return; } if (view === 'profile') { if (handle) loadProfile(handle); else renderProfile(); } else renderPosts(); }
function openLogin() { document.querySelector('#login-message').textContent = 'Entre para publicar, comentar ou avaliar.'; document.querySelector('#login-dialog').showModal(); }
function requireLogin() { if (state.token) return true; openLogin(); return false; }
function openRating(postId) { const dialog = document.querySelector('#rating-dialog'); dialog.dataset.postId = postId; document.querySelector('#rating-message').textContent = ''; dialog.showModal(); }
async function publish() { if (!requireLogin()) return; const input = document.querySelector('#post-content'); if (!input.value.trim()) return; const button = document.querySelector('#publish-button'); button.disabled = true; try { await api('/posts', { method: 'POST', body: JSON.stringify({ content: input.value }) }); input.value = ''; document.querySelector('#char-count').textContent = '0 / 280'; await loadPosts(); } catch (error) { statusElement.textContent = error.message; } finally { button.disabled = false; } }

document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.location.hash = link.dataset.view; setView(link.dataset.view); }));
window.addEventListener('hashchange', () => { const [view, handle] = window.location.hash.slice(1).split('/'); setView(view || 'feed', handle || ''); });
document.querySelector('#post-content').addEventListener('input', (event) => { document.querySelector('#char-count').textContent = `${event.target.value.length} / 280`; });
document.querySelector('#publish-button').addEventListener('click', publish);
['#compose-top', '#compose-side', '#compose-bottom'].forEach((selector) => document.querySelector(selector).addEventListener('click', () => { if (!requireLogin()) return; document.querySelector('#composer').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#post-content').focus(); }));
document.querySelector('#search-toggle').addEventListener('click', () => { document.querySelector('#search-form').classList.toggle('hidden'); document.querySelector('#search-input').focus(); });
document.querySelector('#search-close').addEventListener('click', () => { document.querySelector('#search-form').classList.add('hidden'); document.querySelector('#search-input').value = ''; loadPosts(); });
document.querySelector('#search-input').addEventListener('input', (event) => loadPosts(event.target.value));
document.querySelector('#search-form').addEventListener('submit', (event) => { event.preventDefault(); loadPosts(document.querySelector('#search-input').value); });
postsElement.addEventListener('click', (event) => { const profileLink = event.target.closest('.profile-link'); if (profileLink) { event.preventDefault(); window.location.hash = `profile/${profileLink.dataset.handle}`; return; } const toggle = event.target.closest('.comment-toggle'); if (toggle) { const comments = document.querySelector(`#comments-${toggle.dataset.id}`); comments.classList.toggle('hidden'); return; } const button = event.target.closest('.rate-button'); if (!button || !requireLogin()) return; openRating(button.dataset.id); });
document.querySelectorAll('.rating-option').forEach((button) => button.addEventListener('click', async () => { const dialog = document.querySelector('#rating-dialog'); const score = Number(button.dataset.score); try { await api(`/posts/${dialog.dataset.postId}/ratings`, { method: 'POST', body: JSON.stringify({ score }) }); dialog.close(); await loadPosts(); } catch (error) { document.querySelector('#rating-message').textContent = error.message; } }));
document.querySelector('#rating-cancel').addEventListener('click', () => document.querySelector('#rating-dialog').close());
document.querySelector('#login-close').addEventListener('click', () => document.querySelector('#login-dialog').close());
document.querySelector('#rating-close').addEventListener('click', () => document.querySelector('#rating-dialog').close());
postsElement.addEventListener('submit', async (event) => { if (!event.target.matches('.comment-form')) return; event.preventDefault(); if (!requireLogin()) return; const input = event.target.querySelector('input'); if (!input.value.trim()) return; try { await api(`/posts/${event.target.dataset.id}/comments`, { method: 'POST', body: JSON.stringify({ content: input.value }) }); await loadPosts(); } catch (error) { statusElement.textContent = error.message; } });
document.querySelector('#login-open').addEventListener('click', () => document.querySelector('#login-dialog').showModal());
document.querySelector('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = new FormData(event.target); const message = document.querySelector('#login-message'); try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); state.token = result.token; state.user = result.user; localStorage.setItem('diatinf-token', result.token); localStorage.setItem('diatinf-user', JSON.stringify(result.user)); syncCurrentUser(); message.textContent = `Olá, ${result.user.name.split(' ')[0]}!`; setTimeout(() => document.querySelector('#login-dialog').close(), 700); } catch (error) { message.textContent = error.message; } });
syncCurrentUser();
const [initialView, initialHandle] = window.location.hash.slice(1).split('/');
setView(initialView || 'feed', initialHandle || '');
loadPosts();