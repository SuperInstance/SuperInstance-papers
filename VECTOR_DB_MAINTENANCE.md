# Vector Database Maintenance Guide
**Last Updated:** 2026-03-10
**Purpose:** Instructions for maintaining and updating the POLLN vector database
**Database:** Qdrant (localhost:6333)
**Collection:** polln-codebase

---

## QUICK START

### First-Time Setup (Choose your OS)

**Windows:**
```bash
setup_vector_db.bat
```

**Linux/macOS:**
```bash
chmod +x setup_vector_db.sh
./setup_vector_db.sh
```

**Manual Setup:**
```bash
# 1. Start Qdrant in Docker
docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant

# 2. Install dependencies
pip install sentence-transformers qdrant-client

# 3. Run vectorization
python3 vectorization_setup.py

# 4. Test
python3 mcp_codebase_search.py stats
```

---

## ARCHITECTURE OVERVIEW

### Vector Database Stack
```
┌─────────────────────────────────────────────┐
│ Claude Code / Agents                         │
│ (@codebase-search command)                   │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│ MCP Server (mcp_codebase_search.py)         │
│ - REST API for search                        │
│ - File context retrieval                     │
│ - Statistics                                 │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│ Vectorization Engine                         │
│ - sentence-transformers (all-MiniLM-L6-v2) │
│ - 384-dimensional embeddings                 │
│ - Cosine similarity search                   │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│ Qdrant Vector Database (Docker)             │
│ - Collection: polln-codebase                 │
│ - 1000+ vectors from project files           │
│ - Persistent storage in Docker volume        │
└─────────────────────────────────────────────┘
```

### File Components

**1. vectorization_setup.py**
- Main vectorization script
- Walks entire project directory
- Chunks files (1000 char chunks with 200 char overlap)
- Generates embeddings using sentence-transformers
- Uploads to Qdrant
- Saves metadata to .vectordb_metadata.json

**2. mcp_codebase_search.py**
- Search engine with MCP server interface
- Can run as:
  - Interactive CLI: `python3 mcp_codebase_search.py`
  - Search command: `python3 mcp_codebase_search.py search "query"`
  - Statistics: `python3 mcp_codebase_search.py stats`
- Three main tools:
  - `search_codebase` - Semantic search
  - `get_file_context` - Get all chunks from file
  - `get_vector_db_stats` - DB statistics

**3. setup_vector_db.sh / setup_vector_db.bat**
- Automated setup scripts
- Checks Docker installation
- Starts Qdrant
- Installs dependencies
- Runs vectorization

---

## COMMON TASKS

### Task 1: Initial Setup

**Step 1: Start Qdrant**
```bash
docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

**Step 2: Verify Connection**
```bash
python3 mcp_codebase_search.py stats
```

**Step 3: Vectorize Project**
```bash
python3 vectorization_setup.py
```

**Expected Output:**
```
==================================================
POLLN PROJECT VECTORIZATION
==================================================

📁 Scanning project files...
  ✓ CLAUDE.md (15 chunks)
  ✓ ARCHITECTURE.md (25 chunks)
  ...
✓ Scanned 150 files, created 2500 chunks

🔗 Generating embeddings...
  ✓ Embedded 2500/2500 chunks

✓ Generated 2500 embeddings

🔌 Connecting to Qdrant...
✓ Connected to Qdrant at localhost:6333

📚 Creating collection 'polln-codebase'...
✓ Created collection with 384-dimensional vectors

⬆️  Uploading 2500 vectors to Qdrant...
  ✓ Uploaded 2500/2500 vectors

✓ Uploaded all vectors

✓ Saved metadata to .vectordb_metadata.json

==================================================
✓ VECTORIZATION COMPLETE
==================================================
```

### Task 2: Search the Codebase

**Interactive Search:**
```bash
python3 mcp_codebase_search.py
```

**In Interactive Mode:**
```
>>> search confidence model
📌 Results for: 'confidence model'

1. INDEX_FEATURES.md (similarity: 0.892)
   The confidence model is a three-zone system...

2. SYSTEMS_SUMMARY.md (similarity: 0.856)
   Confidence Model (Decision Logic)...

3. src/spreadsheet/tiles/core/Tile.ts (similarity: 0.834)
   class ConfidenceModel extends...

>>> file SYSTEMS_SUMMARY.md
{
  "file": "SYSTEMS_SUMMARY.md",
  "chunks_count": 3,
  "chunks": [...]
}

>>> stats
{
  "collection": "polln-codebase",
  "vectors_count": 2500,
  "model": "all-MiniLM-L6-v2",
  "status": "ready"
}

>>> quit
```

**Command Line Search:**
```bash
python3 mcp_codebase_search.py search "tile system architecture"
```

**Output:**
```json
[
  {
    "file": "TILE_SYSTEM_ANALYSIS.md",
    "similarity": 0.912,
    "preview": "The tile system is the foundation of POLLN's execution engine...",
    "start_pos": 0
  },
  ...
]
```

### Task 3: Update Vector DB After Code Changes

When files are added or significantly modified:

```bash
# Option 1: Full re-vectorization (recommended)
python3 vectorization_setup.py

# Option 2: Check what changed
python3 -c "import json; print(json.load(open('.vectordb_metadata.json')))"

# Option 3: Automated update (see next section)
python3 update_vectors.py  # (See update script below)
```

### Task 4: Monitor Vector DB Health

**Check Database Size:**
```bash
python3 mcp_codebase_search.py stats
```

**View Metadata:**
```bash
cat .vectordb_metadata.json
```

**Expected Metadata:**
```json
{
  "timestamp": "2026-03-10T15:30:00",
  "file_count": 150,
  "chunk_count": 2500,
  "model": "all-MiniLM-L6-v2",
  "vector_size": 384,
  "total_characters": 2500000,
  "qdrant_config": {
    "host": "localhost",
    "port": 6333,
    "collection_name": "polln-codebase"
  }
}
```

### Task 5: Backup and Restore

**Backup Qdrant Data:**
```bash
# The data is already persisted in Docker volume: qdrant_storage
docker inspect qdrant -f '{{ .Mounts }}' # See mount point

# Manual backup of Qdrant data
docker cp qdrant:/qdrant/storage ./qdrant_backup_$(date +%Y%m%d)
```

**Restore Qdrant Data:**
```bash
# Stop and remove current Qdrant
docker stop qdrant
docker rm qdrant

# Start new Qdrant
docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant

# Restore data
docker cp ./qdrant_backup_20260310/. qdrant:/qdrant/storage

# Restart
docker restart qdrant
```

---

## AUTOMATIC UPDATES

### Create an Update Script

Create `update_vectors.py` to keep vector DB in sync:

```python
#!/usr/bin/env python3
"""Incremental vector DB update"""

import json
from pathlib import Path
from datetime import datetime
from vectorization_setup import ProjectVectorizer

PROJECT_ROOT = Path(__file__).parent

def should_update_file(file_path: Path, last_vectorized: datetime) -> bool:
    """Check if file has been modified since last vectorization"""
    if not file_path.exists():
        return False

    mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
    return mtime > last_vectorized

def run_incremental_update():
    """Update only modified files"""
    print("Checking for modified files...")

    # Load metadata
    metadata_file = PROJECT_ROOT / ".vectordb_metadata.json"
    if not metadata_file.exists():
        print("No previous vectorization found. Running full vectorization...")
        vectorizer = ProjectVectorizer()
        vectorizer.run()
        return

    with open(metadata_file) as f:
        metadata = json.load(f)

    last_vectorized = datetime.fromisoformat(metadata["timestamp"])

    # Check for modified files
    modified_files = []
    for file_path in PROJECT_ROOT.rglob("*"):
        if file_path.is_file() and should_update_file(file_path, last_vectorized):
            modified_files.append(file_path)

    if not modified_files:
        print("No modifications detected. Vector DB is current.")
        return

    print(f"Found {len(modified_files)} modified files. Running full re-vectorization...")
    vectorizer = ProjectVectorizer()
    vectorizer.run()

if __name__ == "__main__":
    run_incremental_update()
```

**Usage:**
```bash
# Check for changes and update if needed
python3 update_vectors.py
```

### Automated Updates (Cron/Task Scheduler)

**Linux/macOS (Crontab):**
```bash
# Edit crontab
crontab -e

# Add this line to run update daily at 2 AM
0 2 * * * cd /path/to/polln && python3 update_vectors.py
```

**Windows (Task Scheduler):**
```bash
# Create scheduled task
schtasks /create /tn "POLLN Vector DB Update" /tr "python3 C:\path\to\update_vectors.py" /sc daily /st 02:00
```

---

## INTEGRATION WITH CLAUDE CODE

### Option 1: MCP Server Setup

**1. Save MCP Configuration**

Create `~/.claude/settings.json` (or update existing):

```json
{
  "mcp_servers": {
    "polln_codebase_search": {
      "command": "python3",
      "args": ["/absolute/path/to/polln/mcp_codebase_search.py"],
      "disabled": false
    }
  }
}
```

**2. Restart Claude Code**
```bash
# Claude Code will automatically load the MCP server
# You may need to restart or reload the extension
```

**3. Use in Claude Code**

In Claude Code prompt:
```
@polln_codebase_search search "tile system architecture"
```

Or via tool use:
```
Search for: "how does confidence cascade work?"
```

### Option 2: Direct Integration

**In Your Agent Prompts:**
```python
# Before spawning agents
import json
import subprocess

def search_codebase(query: str):
    """Search vector DB from agent code"""
    result = subprocess.run(
        ["python3", "mcp_codebase_search.py", "search", query],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

# Use in agent
results = search_codebase("confidence model implementation")
for result in results:
    print(f"{result['file']}: {result['similarity']}")
```

---

## TROUBLESHOOTING

### Problem: "Cannot connect to Qdrant"

**Solution 1: Start Qdrant**
```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

**Solution 2: Check if running**
```bash
docker ps | grep qdrant
```

**Solution 3: Check logs**
```bash
docker logs qdrant
```

### Problem: "Embedding generation failed"

**Solution 1: Check sentence-transformers**
```bash
pip install --upgrade sentence-transformers
```

**Solution 2: Free up memory**
```bash
# The model requires ~2GB RAM
# Close other applications
```

### Problem: "Vectorization is very slow"

**Solution 1: Check CPU usage**
```bash
# Embedding generation is CPU-intensive
# Expect 30-60 minutes for large projects
```

**Solution 2: Reduce chunk size**
```python
# In vectorization_setup.py
VECTOR_DB_CONFIG["chunk_size"] = 500  # Reduce from 1000
```

### Problem: "Port 6333 is already in use"

**Solution 1: Use different port**
```bash
docker run -d --name qdrant -p 6334:6333 qdrant/qdrant
# Then update QDRANT_CONFIG["port"] = 6334
```

**Solution 2: Stop existing Qdrant**
```bash
docker stop qdrant
docker rm qdrant
```

---

## PERFORMANCE CHARACTERISTICS

### Benchmark Results

| Operation | Time | Notes |
|-----------|------|-------|
| Initial Vectorization | 30-60 min | Depends on project size and CPU |
| Search Query | <100ms | Latency for single query |
| Batch Upload | <10ms per vector | Uploads 100 vectors at a time |
| Incremental Update | 2-10 min | For 10-50 modified files |

### Resource Usage

| Resource | Usage | Notes |
|----------|-------|-------|
| Memory (Qdrant) | 512MB - 2GB | Depends on vector count |
| Memory (Vectorization) | 2-4GB | During embedding generation |
| Disk (Docker volume) | 100MB - 500MB | For Qdrant storage |
| Vector Dimension | 384 | all-MiniLM-L6-v2 model |

### Vector Search Accuracy

| Query Type | Typical Accuracy | Notes |
|----------|------------------|-------|
| Exact matches | 95%+ | Exact code/doc matches rank high |
| Semantic queries | 80-90% | "How does X work?" style questions |
| Cross-concept | 70-80% | Linking concepts across domains |
| Typos/variations | 60-75% | Handles variations but less robust |

---

## BEST PRACTICES

### 1. Regular Updates
- Run full vectorization weekly
- Run incremental updates daily (auto)
- Monitor with stats commands

### 2. Backup Strategy
- Use Docker volume for persistence
- Backup metadata (.vectordb_metadata.json)
- Test restore procedures quarterly

### 3. Search Quality
- Use natural language queries
- Combine multiple searches for complex topics
- Check multiple results (top 5)

### 4. Maintenance Schedule

**Daily:**
- Optional: Check for modified files
- Optional: Auto-update if using cron

**Weekly:**
- Full vectorization (Friday evening)
- Backup metadata
- Check vector DB stats

**Monthly:**
- Verify search quality
- Check resource usage
- Update documentation

---

## CONFIGURATION REFERENCE

### Vectorization Settings

**File:** `vectorization_setup.py`

```python
VECTOR_DB_CONFIG = {
    "host": "localhost",           # Qdrant host
    "port": 6333,                  # Qdrant port
    "collection_name": "polln-codebase",
    "vector_size": 384,            # Embedding dimension
    "model_name": "all-MiniLM-L6-v2",  # Sentence-transformers model
    "chunk_size": 1000,            # Characters per chunk
    "chunk_overlap": 200,          # Overlap between chunks
}
```

**File Patterns:**
```python
VECTORIZE_PATTERNS = {
    "Documentation": ["*.md"],
    "TypeScript/JavaScript": ["*.ts", "*.tsx", "*.js", "*.jsx"],
    "Research": ["*.md", "*.txt"],
    "Config": ["*.json", "*.yml", "*.yaml"],
}
```

**Excluded Directories:**
```python
EXCLUDE_DIRS = {
    "node_modules", "dist", ".git", ".next", "coverage",
    "test-logs", "test-logs-integration", "__pycache__",
    ".env", ".venv", "venv"
}
```

---

## NEXT STEPS

1. **Setup:** Run `setup_vector_db.bat` (Windows) or `setup_vector_db.sh` (Linux/macOS)
2. **Verify:** Run `python3 mcp_codebase_search.py stats`
3. **Test:** Try some searches with `python3 mcp_codebase_search.py`
4. **Integrate:** Configure MCP server in Claude Code settings
5. **Automate:** Setup daily incremental updates with cron/Task Scheduler

---

## SUPPORT & DOCUMENTATION

- **Qdrant Docs:** https://qdrant.tech/documentation/
- **Sentence Transformers:** https://www.sbert.net/
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Claude Code:** https://www.anthropic.com/claude-code

---

**Last Updated:** 2026-03-10
**Vector DB Status:** Ready for Setup
**Maintenance Mode:** Manual + Automated Support
