const $ = (id) => document.getElementById(id);
const DEFAULT_API = 'http://localhost:4000/api';
async function init() {
  const saved = await chrome.storage.local.get(['apiBase', 'token', 'profile']);
  $('apiBase').value = saved.apiBase || DEFAULT_API;
  $('token').value = saved.token || '';
  if (saved.profile) $('profileStatus').textContent = `Profile synced for ${saved.profile.name || saved.profile.email || 'your account'}.`;
}
function base() { return $('apiBase').value.trim().replace(/\/$/, ''); }
function token() { return $('token').value.trim(); }
async function requestProfile() {
  if (!token()) throw new Error('Paste your ApplyPilot session token first.');
  const response = await fetch(`${base()}/auth/me`, { headers: { Authorization: `Bearer ${token()}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Profile request failed (${response.status}).`);
  return data.user;
}
$('save').addEventListener('click', async () => {
  try {
    if (!/^https?:\/\//i.test(base())) throw new Error('API URL must start with http:// or https://.');
    await chrome.storage.local.set({ apiBase: base(), token: token() });
    $('status').style.color = '#18794e'; $('status').textContent = 'Connection saved locally.';
  } catch (e) { $('status').style.color = '#a23c35'; $('status').textContent = e.message; }
});
$('sync').addEventListener('click', async () => {
  $('status').textContent = 'Syncing profile…';
  try {
    const user = await requestProfile();
    const profile = {
      name: user.name || '', email: user.email || '', phone: user.phone || '', location: user.location || '',
      headline: user.headline || '', skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
      linkedIn: user.linkedIn || '', github: user.github || '', portfolio: user.portfolio || '', yearsExperience: user.yearsExperience || ''
    };
    await chrome.storage.local.set({ apiBase: base(), token: token(), profile });
    $('profileStatus').textContent = `Profile synced for ${profile.name || profile.email}.`;
    $('status').style.color = '#18794e'; $('status').textContent = 'Profile synced. You can scan a job form.';
  } catch (e) { $('status').style.color = '#a23c35'; $('status').textContent = e.message; }
});
$('scan').addEventListener('click', async () => {
  const saved = await chrome.storage.local.get(['profile']);
  if (!saved.profile) { $('status').textContent = 'Sync your profile before scanning a page.'; return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) { $('status').textContent = 'Open an http/https job application page first.'; return; }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    $('status').style.color = '#18794e'; $('status').textContent = 'Review panel opened on the current page.';
  } catch (e) { $('status').style.color = '#a23c35'; $('status').textContent = `Could not scan this page: ${e.message}`; }
});
$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove(['apiBase', 'token', 'profile']);
  $('apiBase').value = DEFAULT_API; $('token').value = ''; $('profileStatus').textContent = 'Profile not synced yet.';
  $('status').textContent = 'Local token and profile removed.';
});
init();
