---
"@dualmark/core": patch
---

Fix `cleanBody` leaking raw tags when a tag spans multiple lines.

The HTML-tag replacement (e.g. `<Highlighted>…</Highlighted>` to `**…**`, and any custom `htmlTagReplacements`) used a regex without the dotAll flag, so `.` never matched newlines. A tag whose content spanned more than one line was left untouched, leaking raw markup into the cleaned markdown that AI clients read. The regex now uses the `s` flag while keeping the lazy match, so multi-line tags are converted and adjacent tags are not merged.
