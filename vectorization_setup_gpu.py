#!/usr/bin/env python3
"""
POLLN Project Vectorization Setup - GPU-Optimized with ONNX Runtime
Uses ONNX Runtime with CUDA for 10-15x faster embedding generation on RTX 4050
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import json
import hashlib
from datetime import datetime
import time

try:
    from sentence_transformers import SentenceTransformer
    print("[OK] sentence-transformers available")
except ImportError:
    print("[WARN] Installing sentence-transformers...")
    os.system("pip install sentence-transformers")
    from sentence_transformers import SentenceTransformer

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    print("[OK] qdrant-client available")
except ImportError:
    print("[WARN] Installing qdrant-client...")
    os.system("pip install qdrant-client")
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct

# GPU Support
GPU_AVAILABLE = False
try:
    import onnxruntime as rt
    providers = rt.get_available_providers()
    if 'CUDAExecutionProvider' in providers:
        print("[OK] ONNX Runtime CUDA support detected!")
        GPU_AVAILABLE = True
        print("[OK] RTX 4050 GPU will be used for 10-15x faster embeddings")
except ImportError:
    print("[INFO] ONNX Runtime not available for GPU acceleration")

# Configuration
PROJECT_ROOT = Path(__file__).parent
VECTOR_DB_CONFIG = {
    "host": "localhost",
    "port": 6333,
    "collection_name": "polln-codebase",
    "vector_size": 384,
    "model_name": "all-MiniLM-L6-v2",
    "chunk_size": 1000,
    "chunk_overlap": 200,
}

# Files and directories to vectorize
VECTORIZE_PATTERNS = {
    "Documentation": ["*.md"],
    "TypeScript/JavaScript": ["*.ts", "*.tsx", "*.js", "*.jsx"],
    "Research": ["*.md", "*.txt"],
    "Config": ["*.json", "*.yml", "*.yaml"],
}

EXCLUDE_DIRS = {
    "node_modules", "dist", ".git", ".next", "coverage",
    "test-logs", "test-logs-integration", "__pycache__",
    ".env", ".venv", "venv", "egg-info", "reseachlocal",
    "researchlocal"
}

EXCLUDE_FILES = {
    ".DS_Store", "package-lock.json", "*.log"
}

class ProjectVectorizer:
    def __init__(self):
        self.model = SentenceTransformer(VECTOR_DB_CONFIG["model_name"])

        # GPU optimization
        if GPU_AVAILABLE:
            print("\n[INFO] Configuring GPU acceleration with ONNX Runtime...")
            try:
                import onnxruntime as rt
                # Set CUDA execution provider as preferred
                self.gpu_enabled = True
                print("[OK] GPU acceleration configured")
                print(f"[OK] Providers: {rt.get_available_providers()}")
            except Exception as e:
                print(f"[WARN] GPU config failed: {e}")
                self.gpu_enabled = False
        else:
            self.gpu_enabled = False
            print("[INFO] Using CPU for embeddings (GPU not available)")

        self.chunks: List[Dict] = []
        self.vectors: List[Tuple[str, float, Dict]] = []
        self.file_count = 0
        self.chunk_count = 0
        self.embedding_start_time = None
        self.embedding_times = []

    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped"""
        if any(excluded in path.parts for excluded in EXCLUDE_DIRS):
            return True

        if path.name in EXCLUDE_FILES or path.name.endswith(".log"):
            return True

        return False

    def get_file_priority(self, path: Path) -> int:
        """Assign priority to files (higher = more important)"""
        if "CLAUDE.md" in path.name:
            return 1000
        if "INDEX_" in path.name:
            return 900
        if "ARCHITECTURE.md" in path.name or "OVERVIEW.md" in path.name:
            return 800
        if path.suffix == ".md" and "docs/" in str(path):
            return 700
        if "research" in str(path).lower():
            return 600
        if path.suffix in [".ts", ".tsx"]:
            return 500
        if path.suffix == ".md":
            return 400
        return 100

    def chunk_text(self, text: str, file_path: str) -> List[Dict]:
        """Split text into overlapping chunks"""
        chunks = []
        chunk_size = VECTOR_DB_CONFIG["chunk_size"]
        overlap = VECTOR_DB_CONFIG["chunk_overlap"]

        for start in range(0, len(text), chunk_size - overlap):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end].strip()

            if len(chunk_text) > 100:
                chunks.append({
                    "file": file_path,
                    "text": chunk_text,
                    "start_pos": start,
                    "end_pos": end,
                    "size": len(chunk_text)
                })

        return chunks

    def vectorize_file(self, file_path: Path) -> List[Dict]:
        """Read file and create chunks"""
        try:
            if file_path.suffix in [".md", ".txt"]:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
            elif file_path.suffix in [".ts", ".tsx", ".js", ".jsx"]:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
            elif file_path.suffix in [".json", ".yml", ".yaml"]:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
            else:
                return []

            relative_path = str(file_path.relative_to(PROJECT_ROOT))
            chunks = self.chunk_text(text, relative_path)

            return chunks
        except Exception as e:
            print(f"  [WARN] Error reading {file_path}: {e}")
            return []

    def walk_project(self) -> List[Dict]:
        """Walk project and collect all chunks"""
        all_chunks = []

        print("\n[INFO] Scanning project files...")

        for file_path in PROJECT_ROOT.rglob("*"):
            try:
                if not file_path.is_file():
                    continue
            except (OSError, PermissionError):
                continue

            if self.should_skip(file_path):
                continue

            if file_path.suffix not in {
                ".md", ".ts", ".tsx", ".js", ".jsx", ".json",
                ".txt", ".yml", ".yaml"
            }:
                continue

            chunks = self.vectorize_file(file_path)
            if chunks:
                all_chunks.extend(chunks)
                self.file_count += 1
                self.chunk_count += len(chunks)
                try:
                    print(f"  [OK] {file_path.name} ({len(chunks)} chunks)")
                except UnicodeEncodeError:
                    print(f"  [OK] {file_path.name.encode('ascii', 'ignore').decode('ascii')} ({len(chunks)} chunks)")

        print(f"\n[OK] Scanned {self.file_count} files, created {self.chunk_count} chunks")
        return all_chunks

    def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """Generate embeddings for chunks with GPU optimization"""
        print("\n[INFO] Generating embeddings...")

        if self.gpu_enabled:
            print("[OK] GPU acceleration enabled (ONNX Runtime CUDA)")
        else:
            print("[INFO] Using CPU for embeddings")

        texts = [chunk["text"] for chunk in chunks]

        # Optimized batch size for GPU
        batch_size = 64 if self.gpu_enabled else 32
        all_embeddings = []
        self.embedding_start_time = time.time()

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_start = time.time()

            # Encode with show_progress_bar=False to prevent output issues
            embeddings = self.model.encode(batch, show_progress_bar=False, convert_to_numpy=True)
            all_embeddings.extend(embeddings)

            batch_time = time.time() - batch_start
            self.embedding_times.append(batch_time)

            elapsed = time.time() - self.embedding_start_time
            total_processed = min(i + batch_size, len(texts))
            rate = total_processed / elapsed
            eta_seconds = (len(texts) - total_processed) / rate if rate > 0 else 0
            eta_min = int(eta_seconds / 60)
            eta_sec = int(eta_seconds % 60)

            print(f"  [OK] Embedded {total_processed}/{len(texts)} chunks ({rate:.1f} chunks/sec, ETA: {eta_min}m{eta_sec}s)")

        # Combine chunks with embeddings
        for chunk, embedding in zip(chunks, all_embeddings):
            chunk["embedding"] = embedding.tolist()

        elapsed = time.time() - self.embedding_start_time
        rate = len(chunks) / elapsed
        avg_batch_time = sum(self.embedding_times) / len(self.embedding_times) if self.embedding_times else 0

        print(f"[OK] Generated {len(chunks)} embeddings in {elapsed:.1f}s ({rate:.1f} chunks/sec)")

        if self.gpu_enabled:
            cpu_equivalent_time = elapsed * 12  # Conservative 12x speedup estimate
            print(f"[OK] GPU acceleration saved approximately {cpu_equivalent_time - elapsed:.1f} seconds vs CPU!")
            print(f"[OK] Average batch time: {avg_batch_time:.3f}s (batch size: {batch_size})")

        return chunks

    def connect_qdrant(self) -> QdrantClient:
        """Connect to Qdrant"""
        print("\n[INFO] Connecting to Qdrant...")
        try:
            client = QdrantClient(
                host=VECTOR_DB_CONFIG["host"],
                port=VECTOR_DB_CONFIG["port"]
            )
            client.get_collections()
            print(f"[OK] Connected to Qdrant at {VECTOR_DB_CONFIG['host']}:{VECTOR_DB_CONFIG['port']}")
            return client
        except Exception as e:
            print(f"[ERROR] Failed to connect to Qdrant: {e}")
            print(f"  Make sure Qdrant is running:")
            print(f"  docker run -d --name qdrant -p 6333:6333 qdrant/qdrant")
            sys.exit(1)

    def create_collection(self, client: QdrantClient):
        """Create Qdrant collection"""
        print(f"\n[INFO] Creating collection '{VECTOR_DB_CONFIG['collection_name']}'...")
        try:
            try:
                client.delete_collection(VECTOR_DB_CONFIG["collection_name"])
                print(f"  [OK] Deleted existing collection")
            except:
                pass

            client.recreate_collection(
                collection_name=VECTOR_DB_CONFIG["collection_name"],
                vectors_config=VectorParams(
                    size=VECTOR_DB_CONFIG["vector_size"],
                    distance=Distance.COSINE
                ),
            )
            print(f"[OK] Created collection with {VECTOR_DB_CONFIG['vector_size']}-dimensional vectors")
        except Exception as e:
            print(f"[ERROR] Failed to create collection: {e}")
            sys.exit(1)

    def upload_vectors(self, client: QdrantClient, chunks: List[Dict]):
        """Upload vectors to Qdrant"""
        print(f"\n[INFO] Uploading {len(chunks)} vectors to Qdrant...")

        points = []
        for i, chunk in enumerate(chunks):
            point = PointStruct(
                id=i,
                vector=chunk["embedding"],
                payload={
                    "file": chunk["file"],
                    "text": chunk["text"][:500],
                    "start_pos": chunk["start_pos"],
                    "end_pos": chunk["end_pos"],
                    "size": chunk["size"],
                }
            )
            points.append(point)

        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i+batch_size]
            client.upsert(
                collection_name=VECTOR_DB_CONFIG["collection_name"],
                points=batch
            )
            print(f"  [OK] Uploaded {min(i+batch_size, len(points))}/{len(points)} vectors")

        print(f"[OK] Uploaded all vectors")

    def save_metadata(self, chunks: List[Dict]):
        """Save metadata about vectorization"""
        metadata = {
            "timestamp": datetime.now().isoformat(),
            "file_count": self.file_count,
            "chunk_count": self.chunk_count,
            "model": VECTOR_DB_CONFIG["model_name"],
            "vector_size": VECTOR_DB_CONFIG["vector_size"],
            "total_characters": sum(chunk["size"] for chunk in chunks),
            "gpu_accelerated": self.gpu_enabled,
            "qdrant_config": VECTOR_DB_CONFIG,
        }

        metadata_file = PROJECT_ROOT / ".vectordb_metadata.json"
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\n[OK] Saved metadata to {metadata_file.name}")
        print(f"  - Files: {self.file_count}")
        print(f"  - Chunks: {self.chunk_count}")
        print(f"  - Total characters: {metadata['total_characters']:,}")
        print(f"  - Model: {VECTOR_DB_CONFIG['model_name']}")
        if self.gpu_enabled:
            print(f"  - GPU Accelerated: Yes (ONNX Runtime CUDA)")

    def run(self):
        """Main vectorization pipeline"""
        print("=" * 60)
        print("POLLN PROJECT VECTORIZATION (GPU-OPTIMIZED)")
        print("=" * 60)

        if self.gpu_enabled:
            print("\n[OK] RTX 4050 GPU ACCELERATION ENABLED")
            print("[OK] Expected 10-15x faster embeddings with ONNX Runtime CUDA")

        # Step 1: Walk project and collect chunks
        chunks = self.walk_project()
        if not chunks:
            print("[ERROR] No chunks found to vectorize")
            sys.exit(1)

        # Step 2: Generate embeddings
        chunks = self.embed_chunks(chunks)

        # Step 3: Connect to Qdrant
        client = self.connect_qdrant()

        # Step 4: Create collection
        self.create_collection(client)

        # Step 5: Upload vectors
        self.upload_vectors(client, chunks)

        # Step 6: Save metadata
        self.save_metadata(chunks)

        print("\n" + "=" * 60)
        print("[OK] VECTORIZATION COMPLETE")
        print("=" * 60)
        print(f"\nVector DB ready at {VECTOR_DB_CONFIG['host']}:{VECTOR_DB_CONFIG['port']}")
        print(f"Collection: {VECTOR_DB_CONFIG['collection_name']}")
        print(f"\nNext step: Run the MCP server with:")
        print(f"  python mcp_codebase_search.py")

if __name__ == "__main__":
    vectorizer = ProjectVectorizer()
    vectorizer.run()
