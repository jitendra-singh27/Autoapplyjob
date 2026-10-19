# ApplyPilot extension patch for `jitendra-singh27/Autoapplyjob`

This patch replaces the `extension/` files in the existing repository and adds two manual-assistant files.

## Why this patch

The current extension only detects `input` and `textarea`; it misses `select` dropdowns and some commonly used accessible labels. This version:

- Scans inputs, textareas and single-select dropdowns on supported third-party application forms.
- Uses associated labels, `aria-label`, `aria-labelledby`, `aria-describedby`, placeholders, `autocomplete`, names, IDs and small field-group text.
- Suggests a dropdown only when the saved answer matches a real option exactly; it does not guess unknown eligibility answers.
- Keeps the review step and never clicks Apply, Next, Continue or Submit.
- Adds a separate manual copy page for LinkedIn and Indeed. It does not inject into, inspect, change, or autofill those websites; the user copies a value and pastes it themselves.
- Keeps extension profile and extra answers in local Chrome extension storage.

LinkedIn says third-party extensions that automate activity on its website are not allowed. Indeed's terms prohibit automating the Indeed Apply process outside official tools/vendors. See the current official policies before distributing an extension: https://www.linkedin.com/help/linkedin/answer/a1341543 and https://in.indeed.com/legal.

## Apply the patch

1. Download and extract this patch ZIP.
2. Copy the included `extension/` directory over the `extension/` directory in your repository, keeping the directory structure.
3. Open `chrome://extensions`, enable Developer mode, and click Reload for ApplyPilot (or remove and load the updated `extension` folder).
4. Start the backend as documented in the repository README, log in through ApplyPilot, copy the session token into the extension popup, save, and click **Sync profile from ApplyPilot**.
5. On a supported third-party ATS page, use **Scan supported form & review**. On LinkedIn or Indeed, use **Open manual copy assistant** and paste each value yourself.

## Local checks

The JavaScript files should pass `node --check`, and `manifest.json` should parse as JSON. This patch has not been live-tested on authenticated LinkedIn, Indeed, or employer ATS application sessions. Custom widgets, file upload controls and scanned resume content remain manual.
