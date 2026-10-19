(() => {
  if (window.__applyPilotReviewOpen) {
    document.getElementById('__applypilot_review_host')?.remove();
    window.__applyPilotReviewOpen = false;
    return;
  }
  window.__applyPilotReviewOpen = true;
  chrome.storage.local.get(['profile'], ({ profile }) => {
    if (!profile) { window.__applyPilotReviewOpen = false; return; }
    const host = document.createElement('div');
    host.id = '__applypilot_review_host';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:16px;right:16px;width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px);';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box} .panel{font:13px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#fff;color:#172033;border:1px solid #dce0ec;border-radius:15px;box-shadow:0 18px 70px #11182740;overflow:hidden;max-height:calc(100vh - 32px);display:flex;flex-direction:column}
        header{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;background:#f6f6ff;border-bottom:1px solid #e5e7f2}h2{font-size:15px;margin:0}p{font-size:11px;color:#697187;margin:4px 0 0}.close{border:0;background:transparent;font-size:23px;cursor:pointer;color:#586078;padding:0 4px}.summary{padding:10px 16px;background:#fff9e9;color:#7a5213;font-size:11px;border-bottom:1px solid #f0e4c6}.fields{padding:8px 14px;overflow:auto}.field{padding:10px 2px;border-bottom:1px solid #eef0f5}.field:last-child{border:0}.label{display:flex;gap:8px;align-items:center;font-weight:700;font-size:12px}.value{display:block;width:100%;margin-top:7px;border:1px solid #d9deea;border-radius:7px;padding:8px;font:12px/1.4 system-ui;color:#293147;background:#fafbff}.empty{padding:20px 5px;color:#697187;text-align:center}.actions{display:flex;gap:8px;padding:13px 14px;border-top:1px solid #e5e7f2}.actions button{flex:1;border:0;border-radius:8px;padding:10px 7px;font-size:12px;font-weight:750;cursor:pointer}.fill{background:#5149e7;color:white}.cancel{background:#f1f2f8;color:#30374c}.foot{padding:0 15px 13px;color:#777f91;font-size:10px}
      </style>
      <section class="panel" aria-label="Review autofill suggestions">
        <header><div><h2>Review before filling</h2><p>Detected fields and suggested values from your profile</p></div><button class="close" aria-label="Close">×</button></header>
        <div class="summary">Only the fields you select will be filled. No form will be submitted.</div>
        <div class="fields" id="fields"></div>
        <div class="actions"><button class="cancel" id="cancel">Cancel</button><button class="fill" id="fill">Fill selected fields</button></div>
        <div class="foot">Check every value. You remain responsible for the accuracy of your application.</div>
      </section>`;
    const fieldsRoot = shadow.getElementById('fields');
    const profileMap = [
      { key: 'name', label: /\b(full\s*name|your name|first and last name|candidate name)\b/i },
      { key: 'email', label: /\b(e-?mail|email address)\b/i },
      { key: 'phone', label: /\b(phone|mobile|telephone|contact number)\b/i },
      { key: 'location', label: /\b(location|city|current address|address|current location)\b/i },
      { key: 'headline', label: /\b(headline|professional title|current title|job title)\b/i },
      { key: 'linkedIn', label: /linkedin/i },
      { key: 'github', label: /github/i },
      { key: 'portfolio', label: /portfolio|personal website|website url/i },
      { key: 'yearsExperience', label: /years? of experience|total experience|experience \(years\)/i },
      { key: 'skills', label: /\b(skills|technical skills|key skills)\b/i }
    ];
    const getLabel = (el) => {
      const idLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      const parentLabel = el.closest('label');
      const aria = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
      const labelledBy = el.getAttribute('aria-labelledby');
      const labelledText = labelledBy ? labelledBy.split(/\s+/).map(id => document.getElementById(id)?.innerText || '').join(' ') : '';
      const fieldset = el.closest('fieldset')?.querySelector('legend')?.innerText || '';
      const text = `${idLabel?.innerText || ''} ${parentLabel?.innerText || ''} ${aria} ${labelledText} ${fieldset} ${el.name || ''}`.replace(/\s+/g,' ').trim();
      return text.slice(0, 160);
    };
    const candidates = [...document.querySelectorAll('input, textarea')].filter(el => {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      const rect = el.getBoundingClientRect();
      return !el.disabled && !el.readOnly && !['hidden','password','file','submit','button','reset','checkbox','radio','image'].includes(type) && rect.width > 0 && rect.height > 0 && !el.closest('#__applypilot_review_host');
    });
    const used = new Set();
    const suggestions = [];
    for (const el of candidates) {
      const label = getLabel(el);
      const mapping = profileMap.find(item => item.label.test(label));
      if (!mapping || !profile[mapping.key] || used.has(el)) continue;
      used.add(el);
      suggestions.push({ el, label: label || mapping.key, value: String(profile[mapping.key]), key: mapping.key });
    }
    if (!suggestions.length) {
      fieldsRoot.innerHTML = '<div class="empty">No confidently matched fields found. Try a standard application form with visible labels.</div>';
      shadow.getElementById('fill').disabled = true;
      shadow.getElementById('fill').style.opacity = '.5';
    } else {
      suggestions.forEach((item, index) => {
        const row = document.createElement('div'); row.className = 'field';
        const label = document.createElement('label'); label.className = 'label';
        const check = document.createElement('input'); check.type = 'checkbox'; check.checked = true; check.dataset.index = String(index);
        const text = document.createElement('span'); text.textContent = item.label;
        label.append(check, text);
        const value = document.createElement('textarea'); value.className = 'value'; value.rows = item.value.length > 100 ? 3 : 1; value.value = item.value; value.dataset.index = String(index); value.setAttribute('aria-label', `Suggested value for ${item.label}`);
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
        const value = item.valueInput.value;
        if (!value.trim()) continue;
        const setter = Object.getOwnPropertyDescriptor(item.el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(item.el, value); else item.el.value = value;
        item.el.dispatchEvent(new Event('input', { bubbles: true }));
        item.el.dispatchEvent(new Event('change', { bubbles: true }));
        item.el.dispatchEvent(new Event('blur', { bubbles: true }));
        count++;
      }
      const note = document.createElement('div'); note.style.cssText = 'padding:10px 15px;background:#e9f8ef;color:#166534;font:12px system-ui;border-top:1px solid #cdebd8';
      note.textContent = `${count} field${count===1?'':'s'} filled. Review the page and submit it yourself when ready.`;
      shadow.querySelector('.panel').appendChild(note);
      shadow.getElementById('fill').disabled = true;
      shadow.getElementById('fill').textContent = 'Filled';
    });
  });
})();
