(() => {
  'use strict';
  const HOST_ID = '__applypilot_review_host';
  const hostname = location.hostname.toLowerCase();
  // LinkedIn disallows third-party extensions that automate or modify activity on its site;
  // Indeed prohibits non-official automation of Indeed Apply. Use manual-assist.html there.
  if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com') || hostname === 'indeed.com' || hostname.endsWith('.indeed.com')) {
    window.alert('ApplyPilot uses manual copy mode on LinkedIn and Indeed. Open the extension and choose “Open manual copy assistant”; this page will not be scanned or modified.');
    return;
  }
  if (window.__applyPilotReviewOpen) {
    document.getElementById(HOST_ID)?.remove();
    window.__applyPilotReviewOpen = false;
    return;
  }
  window.__applyPilotReviewOpen = true;

  chrome.storage.local.get(['profile'], ({ profile }) => {
    if (!profile) {
      window.__applyPilotReviewOpen = false;
      alert('ApplyPilot: sync your profile from the extension popup first.');
      return;
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:16px;right:16px;width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 32px);';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box}.panel{font:13px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#fff;color:#172033;border:1px solid #dce0ec;border-radius:15px;box-shadow:0 18px 70px #11182740;overflow:hidden;max-height:calc(100vh - 32px);display:flex;flex-direction:column}
        header{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;background:#f6f6ff;border-bottom:1px solid #e5e7f2}h2{font-size:15px;margin:0}p{font-size:11px;color:#697187;margin:4px 0 0}.close{border:0;background:transparent;font-size:23px;cursor:pointer;color:#586078;padding:0 4px}.summary{padding:10px 16px;background:#fff9e9;color:#7a5213;font-size:11px;border-bottom:1px solid #f0e4c6}.fields{padding:8px 14px;overflow:auto}.field{padding:10px 2px;border-bottom:1px solid #eef0f5}.field:last-child{border:0}.label{display:flex;gap:8px;align-items:center;font-weight:700;font-size:12px}.value{display:block;width:100%;margin-top:7px;border:1px solid #d9deea;border-radius:7px;padding:8px;font:12px/1.4 system-ui;color:#293147;background:#fafbff}.empty{padding:20px 5px;color:#697187;text-align:center}.actions{display:flex;gap:8px;padding:13px 14px;border-top:1px solid #e5e7f2}.actions button{flex:1;border:0;border-radius:8px;padding:10px 7px;font-size:12px;font-weight:750;cursor:pointer}.fill{background:#5149e7;color:white}.cancel{background:#f1f2f8;color:#30374c}.foot{padding:0 15px 13px;color:#777f91;font-size:10px}.count{padding:7px 15px;background:#f4f5ff;color:#4c46b6;font-size:11px;border-bottom:1px solid #e5e7f2}
      </style>
      <section class="panel" aria-label="Review autofill suggestions">
        <header><div><h2>ApplyPilot · Reviewed autofill</h2><p>Check profile matches before filling</p></div><button class="close" aria-label="Close">×</button></header>
        <div class="summary">Only selected fields are filled. This extension never clicks Apply, Next, Continue, or Submit.</div>
        <div class="count" id="count">Scanning visible form fields…</div>
        <div class="fields" id="fields"></div>
        <div class="actions"><button class="cancel" id="cancel">Cancel</button><button class="fill" id="fill">Fill selected fields</button></div>
        <div class="foot">Unknown or unsupported fields are skipped. Resume uploads, eligibility questions, and custom widgets must be completed manually.</div>
      </section>`;

    const fieldsRoot = shadow.getElementById('fields');
    const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const nameParts = String(profile.name || '').trim().split(/\s+/);
    const mappings = [
      { key: 'firstName', value: nameParts[0] || '', test: /\b(first name|given name|forename)\b/ },
      { key: 'lastName', value: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '', test: /\b(last name|family name|surname)\b/ },
      { key: 'name', value: profile.name, test: /\b(full name|your name|candidate name|legal name)\b/ },
      { key: 'email', value: profile.email, test: /\b(e mail|email address|email)\b/ },
      { key: 'phone', value: profile.phone, test: /\b(phone|mobile|telephone|contact number)\b/ },
      { key: 'location', value: profile.location, test: /\b(city|current location|location|address|postal address)\b/ },
      { key: 'headline', value: profile.headline, test: /\b(headline|professional title|current title|job title|occupation)\b/ },
      { key: 'currentCompany', value: profile.currentCompany, test: /\b(current company|current employer|employer name|company name)\b/ },
      { key: 'yearsExperience', value: profile.yearsExperience, test: /\b(years? of experience|total experience|experience in years|how many years)\b/ },
      { key: 'education', value: profile.education, test: /\b(education|degree|highest qualification|highest level of education|qualification)\b/ },
      { key: 'skills', value: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills, test: /\b(skills|technical skills|key skills|relevant skills)\b/ },
      { key: 'linkedIn', value: profile.linkedIn, test: /linkedin/ },
      { key: 'github', value: profile.github, test: /github/ },
      { key: 'portfolio', value: profile.portfolio, test: /\b(portfolio|personal website|website url|website)\b/ },
      { key: 'salaryExpectation', value: profile.salaryExpectation, test: /\b(expected salary|salary expectation|desired pay|desired salary|salary requirement|pay expectation)\b/ },
      { key: 'noticePeriod', value: profile.noticePeriod, test: /\b(notice period|availability to start|when can you start)\b/ },
      { key: 'workAuthorization', value: profile.workAuthorization, test: /\b(work authorization|authorized to work|legally authorized|right to work)\b/ }
    ].filter((m) => String(m.value ?? '').trim());

    function safeLabelFor(el) {
      const parts = [];
      if (el.labels) parts.push(...Array.from(el.labels).map((label) => label.innerText || label.textContent || ''));
      if (el.id) {
        try {
          const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (label) parts.push(label.innerText || label.textContent || '');
        } catch { /* Ignore malformed IDs. */ }
      }
      for (const attr of ['aria-label', 'placeholder', 'name', 'autocomplete', 'id', 'title', 'data-testid', 'data-test']) {
        const value = el.getAttribute(attr);
        if (value) parts.push(value);
      }
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) parts.push(...labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || document.getElementById(id)?.textContent || ''));
      const describedBy = el.getAttribute('aria-describedby');
      if (describedBy) parts.push(...describedBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || document.getElementById(id)?.textContent || ''));
      const container = el.closest('fieldset, [role="group"], .form-group, .form-field, .field, [data-testid], [data-test]');
      let context = container ? (container.innerText || container.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (context.length > 180) context = '';
      return { direct: parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 240), context };
    }
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !el.disabled && !el.readOnly && !['hidden','password','file','submit','button','reset','checkbox','radio','image'].includes(type) && !el.closest(`#${HOST_ID}`);
    }
    function selectOption(el, desired) {
      if (!(el instanceof HTMLSelectElement) || el.multiple) return null;
      const target = norm(desired);
      const options = Array.from(el.options).filter((o) => !o.disabled && o.value !== '');
      return options.find((o) => norm(o.textContent) === target || norm(o.value) === target) || null;
    }
    function findMapping(el, text) {
      const haystacks = [norm(text.direct), norm(text.context)];
      for (const mapping of mappings) {
        if (!String(mapping.value ?? '').trim()) continue;
        if (!haystacks.some((s) => s && mapping.test.test(s))) continue;
        if (el instanceof HTMLSelectElement && !selectOption(el, mapping.value)) continue;
        return mapping;
      }
      return null;
    }

    const candidates = Array.from(document.querySelectorAll('input, textarea, select')).filter(visible);
    const suggestions = [];
    const seen = new Set();
    for (const el of candidates) {
      const fieldText = safeLabelFor(el);
      const mapping = findMapping(el, fieldText);
      if (!mapping || seen.has(el)) continue;
      seen.add(el);
      const label = (fieldText.direct || fieldText.context || mapping.key).slice(0, 160);
      const initialValue = el instanceof HTMLSelectElement ? String(mapping.value) : String(mapping.value);
      suggestions.push({ el, label, value: initialValue, key: mapping.key, isSelect: el instanceof HTMLSelectElement });
    }

    shadow.getElementById('count').textContent = `${candidates.length} visible fields scanned · ${suggestions.length} confident matches`;
    if (!suggestions.length) {
      fieldsRoot.innerHTML = '<div class="empty">No confident matches found. Confirm this is a supported application form and that your ApplyPilot profile contains the answer. Dropdowns are suggested only when an exact option match exists.</div>';
      shadow.getElementById('fill').disabled = true;
      shadow.getElementById('fill').style.opacity = '.5';
    } else {
      suggestions.forEach((item, index) => {
        const row = document.createElement('div'); row.className = 'field';
        const label = document.createElement('label'); label.className = 'label';
        const check = document.createElement('input'); check.type = 'checkbox'; check.checked = true; check.dataset.index = String(index);
        const text = document.createElement('span'); text.textContent = `${item.label}${item.isSelect ? ' · dropdown' : ''}`;
        label.append(check, text);
        const value = document.createElement('textarea'); value.className = 'value'; value.rows = item.value.length > 90 ? 3 : 1; value.value = item.value; value.dataset.index = String(index); value.setAttribute('aria-label', `Suggested value for ${item.label}`);
        row.append(label, value); fieldsRoot.appendChild(row); item.check = check; item.valueInput = value;
      });
    }

    const close = () => { host.remove(); window.__applyPilotReviewOpen = false; };
    shadow.querySelector('.close').addEventListener('click', close);
    shadow.getElementById('cancel').addEventListener('click', close);
    shadow.getElementById('fill').addEventListener('click', () => {
      let count = 0;
      for (const item of suggestions) {
        if (!item.check.checked) continue;
        const value = item.valueInput.value.trim();
        if (!value) continue;
        if (item.el instanceof HTMLSelectElement) {
          const option = selectOption(item.el, value);
          if (!option) continue;
          const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
          if (setter) setter.call(item.el, option.value); else item.el.value = option.value;
        } else {
          const proto = item.el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(item.el, value); else item.el.value = value;
        }
        item.el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        item.el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        count++;
      }
      const note = document.createElement('div'); note.style.cssText = 'padding:10px 15px;background:#e9f8ef;color:#166534;font:12px system-ui;border-top:1px solid #cdebd8';
      note.textContent = `${count} field${count === 1 ? '' : 's'} filled. Review all fields and submit the application yourself.`;
      shadow.querySelector('.panel').appendChild(note);
      shadow.getElementById('fill').disabled = true;
      shadow.getElementById('fill').textContent = 'Filled';
    });
  });
})();
