const $ = (id) => document.getElementById(id);
const DEFAULT_API = 'http://localhost:4000/api';
const EXTRA_KEYS = ['currentCompany', 'education', 'salaryExpectation', 'noticePeriod', 'workAuthorization'];

async function init() {
  const saved = await chrome.storage.local.get(['apiBase', 'token', 'profile']);
  $('apiBase').value = saved.apiBase || DEFAULT_API;
  $('token').value = saved.token || '';
  if (saved.profile) {
    $('profileStatus').textContent = `Profile synced for ${saved.profile.name || saved.profile.email || 'your account'}.`;
    fillExtra(saved.profile);
  }
}
function base() { return $('apiBase').value.trim().replace(/\/$/, ''); }
function token() { return $('token').value.trim(); }
function status(message, good = false) {
  $('status').style.color = good ? '#18794e' : '#a23c35';
  $('status').textContent = message;
}
function fillExtra(profile = {}) {
  for (const key of EXTRA_KEYS) if ($(key)) $(key).value = profile[key] || '';
}
async function requestProfile() {
  if (!token()) throw new Error('Paste your ApplyPilot session token first.');
  const response = await fetch(`${base()}/auth/me`, { headers: { Authorization: `Bearer ${token()}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Profile request failed (${response.status}).`);
  if (!data.user) throw new Error('The API response did not include a user profile.');
  return data.user;
}
$('save').addEventListener('click', async () => {
  try {
    if (!/^https?:\/\//i.test(base())) throw new Error('API URL must start with http:// or https://.');
    await chrome.storage.local.set({ apiBase: base(), token: token() });
    status('Connection saved locally.', true);
  } catch (error) { status(error.message); }
});
$('sync').addEventListener('click', async () => {
  status('Syncing profile…', true);
  try {
    const user = await requestProfile();
    const old = (await chrome.storage.local.get(['profile'])).profile || {};
    const profile = {
      name: user.name || '', email: user.email || '', phone: user.phone || '', location: user.location || '',
      headline: user.headline || '', skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
      linkedIn: user.linkedIn || '', github: user.github || '', portfolio: user.portfolio || '',
      yearsExperience: user.yearsExperience || '', currentCompany: old.currentCompany || '', education: old.education || '',
      salaryExpectation: old.salaryExpectation || '', noticePeriod: old.noticePeriod || '', workAuthorization: old.workAuthorization || ''
    };
    await chrome.storage.local.set({ apiBase: base(), token: token(), profile });
    fillExtra(profile);
    $('profileStatus').textContent = `Profile synced for ${profile.name || profile.email || 'your account'}.`;
    status('Profile synced. You can scan a supported form or open manual copy mode.', true);
  } catch (error) { status(error.message); }
});
$('scan').addEventListener('click', async () => {
  const saved = await chrome.storage.local.get(['profile']);
  if (!saved.profile) { status('Sync your profile before scanning a page.'); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) { status('Open an http/https job form first.'); return; }
  let host;
  try { host = new URL(tab.url).hostname.toLowerCase(); } catch { status('Could not read the current page URL.'); return; }
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'indeed.com' || host.endsWith('.indeed.com')) {
    status('Page scanning is disabled on LinkedIn and Indeed. Open manual copy assistant instead.');
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    status('Review panel opened on the current page.', true);
  } catch (error) { status(`Could not scan this page: ${error.message}`); }
});
$('manual').addEventListener('click', async () => {
  const saved = await chrome.storage.local.get(['profile']);
  if (!saved.profile) { status('Sync your profile before opening manual copy mode.'); return; }
  await chrome.tabs.create({ url: chrome.runtime.getURL('manual-assist.html') });
});
$('saveExtra').addEventListener('click', async () => {
  const saved = await chrome.storage.local.get(['profile']);
  if (!saved.profile) { status('Sync your main profile first.'); return; }
  const profile = { ...saved.profile };
  for (const key of EXTRA_KEYS) profile[key] = $(key).value.trim();
  await chrome.storage.local.set({ profile });
  status('Extra application answers saved locally.', true);
});
$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove(['apiBase', 'token', 'profile']);
  $('apiBase').value = DEFAULT_API; $('token').value = '';
  $('profileStatus').textContent = 'Profile not synced yet.'; fillExtra({});
  status('Local token and profile removed.', true);
});
init();
