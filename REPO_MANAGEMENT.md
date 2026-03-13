# Repository Management Guide

## Active Repositories

This project works across two related GitHub repositories. **Read this before pushing!**

### 1. Current Working Repository (origin)
- **Remote:** `https://github.com/SuperInstance/polln.git`
- **Purpose:** Active development, paper drafting, simulations
- **Branch:** `papers-main`
- **Push Command:** `git push origin papers-main`

### 2. Publication Repository (superinstance-papers)
- **Remote:** `https://github.com/SuperInstance/SuperInstance-papers.git`
- **Purpose:** Publication-ready versions, official releases
- **Push Command:** `git push superinstance-papers main`

## Git Remote Configuration

```
origin               https://github.com/SuperInstance/polln.git (fetch)
origin               https://github.com/SuperInstance/polln.git (push)
superinstance-papers https://github.com/SuperInstance/SuperInstance-papers.git (fetch)
superinstance-papers https://github.com/SuperInstance/SuperInstance-papers.git (push)
```

## Workflow

### Daily Development
```bash
# Work in polln repo
git add .
git commit -m "Your commit message"
git push origin papers-main
```

### Publication Releases
```bash
# Push to publication repo when papers are ready
git push superinstance-papers main
```

## Important Notes

1. **Default Push Target:** `origin` (polln repo)
2. **Publication Target:** `superinstance-papers`
3. **Current Branch:** `papers-main`
4. **Always verify remote before pushing sensitive changes**

## Verification Commands

```bash
# Check current remote
git remote -v

# Check current branch
git branch

# Verify push target
git remote get-url --push origin
```

## Cross-Repo Synchronization

To sync changes from polln to SuperInstance-papers:
```bash
# Ensure you're on the right branch
git checkout papers-main

# Push to polln (development)
git push origin papers-main

# When ready for publication, push to SuperInstance-papers
git push superinstance-papers main
```

---

**Last Updated:** 2026-03-13
**Maintained By:** Dissertation Team Orchestrator
