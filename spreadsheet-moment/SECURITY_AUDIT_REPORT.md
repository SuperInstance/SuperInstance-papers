# Security Audit Report: Credential Exposure

**Date:** March 15, 2026
**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Audit Type:** Credential Exposure Scan
**Severity:** CRITICAL

---

## Executive Summary

This audit was triggered by an external security researcher reporting exposed NVIDIA API credentials in the repository's git history. The audit confirms that credentials were exposed in commit `7c065a55` and are still accessible in the git history despite being removed from the current branch.

**CRITICAL FINDING:** The exposed credentials are **still in your git history** and accessible to anyone who clones the repository. Simply deleting the files from the current branch does NOT remove them from git history.

---

## Findings

### 1. Exposed NVIDIA API Credentials (CRITICAL)

**Status:** REMOVED from current branch, BUT still in git history
**Severity:** CRITICAL
**Commit:** `7c065a55bf50cd002b50691b5fe7c7019ba6ebba`
**Removed in:** `9aadcc20` (refactor: world-class repository restructuring)

**Affected Files (all deleted in commit 9aadcc20):**
- `research/lucineer_analysis/lucineer/research/fast_creative_sim.py`
- `research/lucineer_analysis/lucineer/research/quick_round_demo.py`
- `research/lucineer_analysis/lucineer/research/nvidia_nim_integration.py`
- `research/lucineer_analysis/lucineer/research/professional_orchestrator.py`
- `research/lucineer_analysis/lucineer/research/generate_testbenches.py`
- `research/lucineer_analysis/lucineer/research/nvidia_nim_sync.py`
- `research/lucineer_analysis/lucineer/research/run_creative_simulations.py`
- `research/lucineer_analysis/lucineer/research/multi_model_orchestrator.py`

**Exposed Credential:**
```
NVIDIA_API_KEY = "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"
```

**Key Pattern:** `nvapi-[95 characters]`

**Impact:**
- The API key is a full-length NVIDIA API token
- Provides access to NVIDIA NIM API services
- Can be used to make API calls on your account
- Potential for unauthorized usage and billing

### 2. Current Codebase Status

**GOOD NEWS:** The current codebase (HEAD) appears to be clean of exposed credentials.

**Scan Results:**
- ✅ No NVIDIA API keys in current files
- ✅ No GitHub personal access tokens (ghp_, gho_)
- ✅ No OpenAI API keys (sk-)
- ✅ No bearer tokens with long credentials

**Note:** Example JWT tokens in documentation are standard JWT headers (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) and are not secrets.

---

## Immediate Actions Required

### 1. ROTATE THE COMPROMISED API KEY (URGENT)

**This is the MOST critical step.** The exposed key must be invalidated immediately.

**Steps:**
1. Log in to NVIDIA Developer Portal
2. Navigate to API Keys section
3. Find the key starting with `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`
4. Revoke/delete this key immediately
5. Generate a new key
6. Update any applications that use this key

**Note:** The old key must be considered permanently compromised. Anyone who has seen the repository history has access to it.

### 2. Git History Remediation Options

You have three options for handling the git history:

#### Option A: Rewrite Git History (RECOMMENDED for Public Repos)

**Pros:** Removes the credential from public view
**Cons:** Changes commit history, requires force push, may affect collaborators

**Steps:**
```bash
# 1. Install BFG Repo-Cleaner or git-filter-repo
# 2. Clone the repository fresh
git clone https://github.com/SuperInstance/spreadsheet-moment.git spreadsheet-moment-clean
cd spreadsheet-moment-clean

# 3. Use BFG to remove the credential from history
bfg --replace-text passwords.txt  # create passwords.txt with the key pattern

# OR use git-filter-repo for more control
git filter-repo --invert-paths --path research/lucineer_analysis/lucineer/research/

# 4. Force push to rewrite history
git push origin main --force
```

**Warning:** This rewrites history. All collaborators will need to re-clone.

#### Option B: Contact GitHub Support

**Pros:** GitHub can help remove sensitive data from history
**Cons:** Takes time, requires support ticket

**Steps:**
1. Submit a support ticket to GitHub
2. Explain that credentials were accidentally committed
3. Request removal of the specific commit from history
4. GitHub may be able to help remove cached views

#### Option C: Document and Monitor (Least Secure)

**Pros:** No history disruption
**Cons:** Credentials remain accessible in history

**Only if:** You've rotated the key and are willing to accept the history exposure

---

## Prevention for Future Commits

### 1. Add .gitignore Rules

Create or update `.gitignore` in the repository root:

```gitignore
# API keys and secrets
*.key
*.pem
nvapi-*
.env
.env.local
secrets/
credentials/
api_keys.txt
```

### 2. Add Pre-commit Hooks

Install and configure pre-commit hooks to scan for secrets:

```bash
pip install pre-commit
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### 3. Add GitHub Secret Scanning

Enable GitHub's secret scanning:
- Go to Repository Settings
- Navigate to "Secrets and variables" → "Secret scanning"
- Enable secret scanning
- GitHub will automatically scan and alert you to exposed credentials

### 4. Education and Process

**Developer Guidelines:**
- NEVER commit API keys, tokens, or passwords
- Use environment variables for all credentials
- Use `.env` files for local development (add to .gitignore)
- Use GitHub Secrets for CI/CD credentials
- Review all diffs before committing

---

## Testing for Users

To make the codebase testable for users without exposing credentials, replace hardcoded keys with placeholder text:

**Before (BAD):**
```python
NVIDIA_API_KEY = "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"
```

**After (GOOD):**
```python
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "your-nvidia-api-key-here")

# Or with clear instructions:
# Get your API key from: https://developer.nvidia.com/
# Set as environment variable: export NVIDIA_API_KEY="your-key-here"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise ValueError("NVIDIA_API_KEY environment variable not set")
```

**Documentation:** Add a section in README.md explaining how users can set up their own credentials:

```markdown
## Configuration

To run simulations, you'll need an NVIDIA API key:

1. Get your key from https://developer.nvidia.com/
2. Set it as an environment variable:
   ```bash
   export NVIDIA_API_KEY="your-key-here"
   ```
3. Run the simulation
```

---

## Conclusion

**Immediate Action Required:** Rotate the exposed NVIDIA API key immediately.

**Status:** The current codebase is clean, but the credential remains in git history accessible to anyone.

**Recommendation:** Rewrite git history using Option A (BFG Repo-Cleaner or git-filter-repo) to remove the credential from public view.

**Prevention:** Implement pre-commit hooks, .gitignore rules, and GitHub secret scanning to prevent future exposures.

---

## Additional Resources

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [How to Rotate API Keys](https://howtorotate.com/docs/introduction/getting-started/)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

---

**Report Generated:** March 15, 2026
**Next Review:** After git history remediation
