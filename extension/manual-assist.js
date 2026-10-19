const root = document.getElementById('profile');
const fields = [
  ['name', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'],
  ['phone', 'Phone'], ['location', 'Location / city'], ['headline', 'Professional title'],
  ['currentCompany', 'Current company'], ['yearsExperience', 'Years of experience'], ['education', 'Education / degree'],
  ['skills', 'Skills'], ['linkedIn', 'LinkedIn profile'], ['github', 'GitHub profile'], ['portfolio', 'Portfolio / website'],
  ['salaryExpectation', 'Expected salary'], ['noticePeriod', 'Notice period'], ['workAuthorization', 'Work authorization (verify before use)']
];
const escapeText = (value) => String(value ?? '');
function render(profile) {
  const nameParts = escapeText(profile.name).trim().split(/\s+/).filter(Boolean);
  const values = { ...profile, firstName: profile.firstName || nameParts[0] || '', lastName: profile.lastName || nameParts.slice(1).join(''), skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills };
  root.replaceChildren();
  const available = fields.filter(([key]) => String(values[key] ?? '').trim());
  if (!available.length) {
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No profile data found. Open the extension popup and sync your profile first.'; root.appendChild(p); return;
  }
  for (const [key, labelText] of available) {
    const card = document.createElement('article'); card.className = 'field';
    const label = document.createElement('label'); label.textContent = labelText;
    const value = document.createElement('textarea'); value.className = 'value'; value.rows = String(values[key]).length > 90 ? 3 : 1; value.value = escapeText(values[key]); value.setAttribute('aria-label', labelText);
    const tools = document.createElement('div'); tools.className = 'tools';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Copy value';
    const hint = document.createElement('span'); hint.className = 'hint'; hint.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(value.value);
        hint.textContent = 'Copied — paste into the form.';
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy value'; }, 1200);
      } catch {
        value.focus(); value.select();
        hint.textContent = 'Text selected. Press Ctrl+C to copy.';
      }
    });
    tools.append(button, hint); card.append(label, value, tools); root.appendChild(card);
  }
}
chrome.storage.local.get(['profile'], ({ profile }) => {
  if (!profile) { root.textContent = 'No profile found. Open the extension popup, connect to ApplyPilot, and sync your profile first.'; return; }
  render(profile);
});
document.getElementById('back').addEventListener('click', () => window.close());
document.getElementById('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'profile', 'apiBase']);
  root.textContent = 'Local profile and token cleared. Close this tab and sync again when needed.';
});
