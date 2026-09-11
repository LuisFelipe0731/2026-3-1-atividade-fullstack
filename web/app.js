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
function relativeTime(date) { const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000)); return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`; }
function postTemplate(post, index) {
  const comments = post.comments.map((comment) => `<div class="comment">${avatar(comment.user)}<p><strong>${comment.user.name}</strong> ${comment.content}</p></div>`).join('');
  return `<article class="post" style="animation-delay:${index * 70}ms"><div class="post-head">${avatar(post.user)}<div class="post-user"><strong>${post.user.name}</strong><small>@${post.user.handle}</small></div><time class="post-time">${relativeTime(post.createdAt)}</time></div><p class="post-content">${post.content.replace(/</g, '&lt;')}</p><div class="post-actions"><button class="action-button comment-toggle" data-id="${post.id}">▢ ${post.comments.length} ${post.comments.length === 1 ? 'comentário' : 'comentários'}</button><button class="action-button rate-button" data-id="${post.id}">★ Avaliar</button><span class="rating">★ ${post.averageRating || '—'} <small>(${post.ratingCount})</small></span></div><div class="comments" id="comments-${post.id}">${comments}<form class="comment-form" data-id="${post.id}"><input maxlength="280" placeholder="Escreva um comentário..." aria-label="Comentário"><button type="submit">Enviar</button></form></div></article>`;
}
function renderPosts() { const visible = state.view === 'mine' ? state.posts.filter((post) => post.user.handle === 'pedrolima') : state.posts; postsElement.innerHTML = visible.length ? visible.map(postTemplate).join('') : '<div class="post"><p>Nenhuma publicação encontrada ainda.</p></div>'; }
async function loadPosts(query = '') { statusElement.textContent = 'Atualizando feed...'; try { state.posts = await api(`/posts${query ? `?q=${encodeURIComponent(query)}` : ''}`); renderPosts(); statusElement.textContent = ''; } catch (error) { statusElement.textContent = error.message; } }
function setView(view) { state.view = view; document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view)); const titles = { feed: 'Feed global', global: 'Feed global', mine: 'Meus posts', profile: 'Meu perfil' }; document.querySelector('#view-title').textContent = titles[view] || titles.feed; document.querySelector('#composer').classList.toggle('hidden', view === 'profile'); renderPosts(); }
function openLogin() { document.querySelector('#login-message').textContent = 'Entre para publicar, comentar ou avaliar.'; document.querySelector('#login-dialog').showModal(); }
function requireLogin() { if (state.token) return true; openLogin(); return false; }
async function publish() { if (!requireLogin()) return; const input = document.querySelector('#post-content'); if (!input.value.trim()) return; const button = document.querySelector('#publish-button'); button.disabled = true; try { await api('/posts', { method: 'POST', body: JSON.stringify({ content: input.value }) }); input.value = ''; document.querySelector('#char-count').textContent = '0 / 280'; await loadPosts(); } catch (error) { statusElement.textContent = error.message; } finally { button.disabled = false; } }

document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.location.hash = link.dataset.view; setView(link.dataset.view); }));
window.addEventListener('hashchange', () => setView(window.location.hash.slice(1) || 'feed'));
document.querySelector('#post-content').addEventListener('input', (event) => { document.querySelector('#char-count').textContent = `${event.target.value.length} / 280`; });
document.querySelector('#publish-button').addEventListener('click', publish);
['#compose-top', '#compose-side', '#compose-bottom'].forEach((selector) => document.querySelector(selector).addEventListener('click', () => { if (!requireLogin()) return; document.querySelector('#composer').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#post-content').focus(); }));
document.querySelector('#search-toggle').addEventListener('click', () => { document.querySelector('#search-form').classList.toggle('hidden'); document.querySelector('#search-input').focus(); });
document.querySelector('#search-close').addEventListener('click', () => { document.querySelector('#search-form').classList.add('hidden'); document.querySelector('#search-input').value = ''; loadPosts(); });
document.querySelector('#search-input').addEventListener('input', (event) => loadPosts(event.target.value));
document.querySelector('#search-form').addEventListener('submit', (event) => { event.preventDefault(); loadPosts(document.querySelector('#search-input').value); });
postsElement.addEventListener('click', async (event) => { const toggle = event.target.closest('.comment-toggle'); if (toggle) { const comments = document.querySelector(`#comments-${toggle.dataset.id}`); comments.classList.toggle('hidden'); return; } const button = event.target.closest('.rate-button'); if (!button || !requireLogin()) return; const score = Number(window.prompt('Dê uma nota de 1 a 3 estrelas:')); if (![1, 2, 3].includes(score)) return; try { await api(`/posts/${button.dataset.id}/ratings`, { method: 'POST', body: JSON.stringify({ score }) }); await loadPosts(); } catch (error) { statusElement.textContent = error.message; } });
postsElement.addEventListener('submit', async (event) => { if (!event.target.matches('.comment-form')) return; event.preventDefault(); if (!requireLogin()) return; const input = event.target.querySelector('input'); if (!input.value.trim()) return; try { await api(`/posts/${event.target.dataset.id}/comments`, { method: 'POST', body: JSON.stringify({ content: input.value }) }); await loadPosts(); } catch (error) { statusElement.textContent = error.message; } });
document.querySelector('#login-open').addEventListener('click', () => document.querySelector('#login-dialog').showModal());
document.querySelector('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = new FormData(event.target); const message = document.querySelector('#login-message'); try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); state.token = result.token; state.user = result.user; localStorage.setItem('diatinf-token', result.token); localStorage.setItem('diatinf-user', JSON.stringify(result.user)); document.querySelector('#login-open').textContent = result.user.name.split(' ')[0]; message.textContent = `Olá, ${result.user.name.split(' ')[0]}!`; setTimeout(() => document.querySelector('#login-dialog').close(), 700); } catch (error) { message.textContent = error.message; } });
if (state.user) document.querySelector('#login-open').textContent = state.user.name.split(' ')[0];
setView(window.location.hash.slice(1) || 'feed');
loadPosts();