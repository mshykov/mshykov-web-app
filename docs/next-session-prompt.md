# Starting prompts for a new session

Copy one block into a fresh assistant session opened in this repo. Each is
self-contained — it points at the docs the assistant needs instead of assuming
prior context.

Current state and open threads: [session-handoff.md](session-handoff.md).

---

## 0. Orientation (use this first in any new session)

```text
This is shykov.dev — my personal site and blog. Before doing anything, read
CLAUDE.md and docs/session-handoff.md, then docs/developer.md for the workflow
rules. Confirm the current state back to me in a few sentences: what branch
we're on, what's open, and what you understand the immediate next steps to be.
Don't change anything yet.
```

---

## 1. Finish and publish the PDP article

Replace the bracketed parts with the real stories before pasting — or paste as
is and answer the assistant's questions.

```text
Let's finish the Professional Development Plan article:
src/content/posts/professional-development-plan-for-engineers.md

Read it plus docs/session-handoff.md ("Releasing a post") first. It's complete
except four _[TODO]_ blocks that need my real stories. Here they are:

1. A PDP goal I completed per plan: [...]
2. A PDP that died as paper, and why: [...]
3. Patterns I see across my reports' PDPs: [...]
4. (Optional) how I actually use an AI agent to track it: [...]

Weave these in matching the voice of the two published posts, keep company
names but blur exact internal metrics, then publish it: published: true, real
publishedAt, add the route to public/sitemap.xml, drop the draft comment in
src/content/posts.ts. Full gate + preview verification, then PR and merge when
green.
```

---

## 2. Triage the open Dependabot PRs

```text
There are several open Dependabot PRs on shykov.dev. Read the "Dependabot
playbook" and "Merge mechanics" sections of docs/session-handoff.md first —
branch protection is strict, so PRs must be merged one at a time with a rebase
between them, and two majors are permanently held for documented reasons.

For each open PR: check whether its build actually passes and merge the safe
ones. If a build fails, read the CI log and find the cause before deciding —
a stale branch, a flaky run, or something fixable in the repo are all more
likely than a genuinely incompatible dependency. Only when you've confirmed the
new version is incompatible should you close the PR and add a Dependabot ignore
rule recording the specific reason. Tell me what you merged, what you held,
what you fixed, and why.
```

---

## 3. Tech debt Phase 1 — the silent-failure batch

```text
Let's do Phase 1 from docs/tech-debt.md. Read that file and docs/developer.md
first.

In one PR:
- Table-driven unit tests for src/components/MarkdownContent.tsx
  (parseMarkdownBlocks: headings, lists, code fences, blockquotes, inline
  bold/quotes) and splitPostContent's figure shortcodes — item 1. This code has
  zero tests and every article depends on it.
- Content assertions in scripts/prerender.mjs: after writing snapshots, fail
  the build if a route's HTML doesn't contain its expected text — item 3.
- Add /blog and one article URL to lighthouserc.json's collect.url — item 5.
  Don't tighten the thresholds; read the threshold note in docs/developer.md.

Full gate + preview verification, PR, merge when green. Then update
docs/tech-debt.md to mark those items done.
```

---

## 4. Decide the fate of the redesign branch

```text
The branch redesign/micrographics-portfolio has been open ~6 weeks (1 commit,
18 files, +1091/−476) and master has moved a lot since — prerendering, two new
posts, a security-header layer.

Read docs/tech-debt.md item 7, then show me what's actually in that branch:
what it changes visually and structurally, whether it still applies cleanly on
current master, and what it would conflict with. Give me a recommendation —
rebase and ship, restart from master, or drop it — and don't change anything
until I decide.
```

---

## 5. Analytics consolidation (Phase 2)

```text
docs/tech-debt.md item 4 suspects shykov.dev is instrumented twice: gtag in
index.html plus Firebase Analytics via src/lib/analytics.ts, which is GA4
underneath.

First just investigate and report — compare the gtag measurement ID with
VITE_FIREBASE_MEASUREMENT_ID and tell me whether it's the same GA4 property.
If it is, propose removing the Firebase analytics path (and what that does to
the bundle and the env-var surface). Read the consent invariant in
docs/security.md before proposing anything — it currently spans five places and
must stay consistent. Don't edit code in this pass.
```
