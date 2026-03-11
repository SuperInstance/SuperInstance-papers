# Vector Database Quick Start Guide
**Purpose:** Quick reference for POLLN vector DB usage
**Database:** Qdrant (semantic search via 384-dim embeddings)
**Setup Time:** 30-60 minutes (one-time)

---

## ⚡ 30-SECOND SETUP

```bash
# Windows
setup_vector_db.bat

# macOS/Linux
./setup_vector_db.sh
```

That's it! The script handles everything.

---

## 🔍 SEARCH COMMANDS

### Interactive Search (Best for Exploration)
```bash
python3 mcp_codebase_search.py
```
Then try:
```
>>> search confidence model
>>> file SYSTEMS_SUMMARY.md
>>> stats
>>> quit
```

### One-Line Search
```bash
python3 mcp_codebase_search.py search "tile system architecture"
```

### Check Status
```bash
python3 mcp_codebase_search.py stats
```

---

## 📋 USAGE PATTERNS FOR AGENTS

### Pattern 1: "I need context on a topic"
```bash
# Instead of reading 50-page white paper
python3 mcp_codebase_search.py search "your topic"
# Read top 5 results (~5 KB)
# Much faster, way less context overhead
```

### Pattern 2: "Where is X implemented?"
```bash
python3 mcp_codebase_search.py search "X implementation"
# Returns: File location + code snippet
```

### Pattern 3: "Get all chunks from a file"
```bash
python3 mcp_codebase_search.py
# Then: file SYSTEMS_SUMMARY.md
# Returns all chunks from that file
```

### Pattern 4: "Find related research"
```bash
python3 mcp_codebase_search.py search "machine learning federation"
# Finds all related chunks across project
```

---

## 📊 DATABASE STATS

**What's Indexed:**
- 150+ project files
- 2500+ vector chunks
- 384-dimensional embeddings
- Entire documentation, code, research

**Storage:**
- Docker volume (auto-persisted)
- ~200-500 MB disk
- No manual backup needed (persists in Docker)

**Search Speed:**
- <100ms per query
- Latency: imperceptible to users

---

## 🔄 KEEPING IT UPDATED

### Manual Update (Recommended Weekly)
```bash
python3 vectorization_setup.py
```

### Incremental Update (For Few Changes)
```bash
python3 update_vectors.py
```

### Automated Update (Optional)
```bash
# Linux/macOS: Add to crontab
0 2 * * * cd /path/to/polln && python3 update_vectors.py

# Windows: Task Scheduler
schtasks /create /tn "POLLN VectorDB Update" /tr "python3 C:\...\update_vectors.py" /sc daily /st 02:00
```

---

## 🛠️ TROUBLESHOOTING

### "Cannot connect to Qdrant"
```bash
# Check if Docker is running
docker ps | grep qdrant

# If not, start it
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

### "Module not found: sentence_transformers"
```bash
pip install sentence-transformers
```

### "Port 6333 already in use"
```bash
# Use different port
docker run -d --name qdrant -p 6334:6333 qdrant/qdrant
# Then update QDRANT_CONFIG["port"] = 6334
```

### "Search is slow"
- First search: 10-20 seconds (model loading)
- Subsequent: <100ms
- This is normal

---

## 📁 FILES

**Setup:**
- `setup_vector_db.bat` (Windows)
- `setup_vector_db.sh` (Linux/macOS)

**Scripts:**
- `vectorization_setup.py` - Main vectorization
- `mcp_codebase_search.py` - Search engine + MCP server
- `update_vectors.py` - Incremental updates (create as needed)

**Docs:**
- `VECTOR_DB_MAINTENANCE.md` - Full reference
- `VECTOR_DB_QUICK_START.md` - This file
- `.vectordb_metadata.json` - Database metadata

---

## 💡 TIPS FOR AGENTS

1. **Always search before reading large docs**
   - Saves 10x context overhead
   - Faster to find what you need

2. **Use natural language queries**
   - "How does X work?" ✓
   - "X implementation Y" ✓
   - "X" alone ✓ (but less specific)

3. **Read multiple results**
   - Top 5 results are usually good
   - Sometimes 2nd-3rd result is best

4. **Use file context when needed**
   - "file SYSTEMS_SUMMARY.md"
   - Gets all chunks from that file

5. **Check stats occasionally**
   - Confirms DB is working
   - Shows vector count

---

## 🚀 WORKFLOWS

### Workflow: Research a New Topic

```
1. Search: python3 mcp_codebase_search.py search "my topic"
2. Read: Top 5 results (preview)
3. Focus: Pick 2-3 most relevant
4. Read: Full documents for those files
5. Reference: Use INDEX files for navigation
6. Explore: Follow cross-references from there
```

**Time Saved:**
- Old way: 1-2 hours reading + searching
- New way: 15-30 minutes with vector DB

### Workflow: Find Code Implementation

```
1. Search: python3 mcp_codebase_search.py search "X implementation"
2. Review: Results show files with code
3. Open: src/path/to/file.ts
4. Understand: Read implementation
5. Test: Use existing test files as examples
```

**Time Saved:**
- Old way: Manual exploration of src/ tree
- New way: Direct to correct file

### Workflow: Connect Two Concepts

```
1. Search concept A: python3 mcp_codebase_search.py search "concept A"
2. Note files with A
3. Search concept B: python3 mcp_codebase_search.py search "concept B"
4. Note files with B
5. Look for overlap
6. Read integration documents
```

**Time Saved:**
- Old way: Read entire architecture doc
- New way: Targeted search + 2-3 files

---

## 📞 QUICK REFERENCE

| Need | Command |
|------|---------|
| Search topic | `python3 mcp_codebase_search.py search "topic"` |
| Interactive | `python3 mcp_codebase_search.py` |
| Stats | `python3 mcp_codebase_search.py stats` |
| Update DB | `python3 vectorization_setup.py` |
| View metadata | `cat .vectordb_metadata.json` |
| Troubleshoot | See VECTOR_DB_MAINTENANCE.md |

---

## 🎯 SUCCESS METRICS

**Vector DB is working if:**
- ✓ `python3 mcp_codebase_search.py stats` shows "ready"
- ✓ Searches return results in <1 second
- ✓ File previews are accurate
- ✓ Similar documents are grouped together

---

## 📚 MORE INFORMATION

- **Full Guide:** `VECTOR_DB_MAINTENANCE.md`
- **Onboarding:** `R&D_PHASE_ONBOARDING_MASTER.md`
- **Orchestrator Guide:** `CLAUDE.md`
- **System Overview:** `SYSTEMS_SUMMARY.md`

---

**Created:** 2026-03-10
**Status:** Production Ready
**Maintenance:** Minimal (weekly re-vectorization recommended)
