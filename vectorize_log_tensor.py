#!/usr/bin/env python3
"""
LOG-Tensor Vectorization Script
Vectorizes the LOG-Tensor folder into Qdrant vector DB
Adds to existing POLLN collection for unified search
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import json
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

# Configuration
PROJECT_ROOT = Path(__file__).parent
LOG_TENSOR_DIR = PROJECT_ROOT / "LOG-tensor"

VECTOR_DB_CONFIG = {
    "host": "localhost",
    "port": 6333,
    "collection_name": "polln-codebase",  # Use same collection for unified search
    "vector_size": 384,
    "model_name": "all-MiniLM-L6-v2",
    "chunk_size": 1000,
    "chunk_overlap": 200,
}

EXCLUDE_FILES = {".DS_Store", "*.log", "package-lock.json"}


class LOGTensorVectorizer:
    def __init__(self):
        self.device = self._detect_device()
        self.model = SentenceTransformer(VECTOR_DB_CONFIG["model_name"])
        self.chunks: List[Dict] = []
        self.file_count = 0
        self.chunk_count = 0

    def _detect_device(self) -> str:
        """Detect available device"""
        try:
            import torch
            if torch.cuda.is_available():
                print(f"[OK] GPU detected: {torch.cuda.get_device_name(0)}")
                return "cuda"
        except:
            pass
        return "cpu"

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
                    "file": f"LOG-tensor/{file_path}",
                    "text": chunk_text,
                    "start_pos": start,
                    "end_pos": end,
                    "size": len(chunk_text),
                    "source": "LOG-Tensor"
                })

        return chunks

    def vectorize_file(self, file_path: Path) -> List[Dict]:
        """Read file and create chunks"""
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            relative_path = str(file_path.relative_to(LOG_TENSOR_DIR))
            chunks = self.chunk_text(text, relative_path)
            return chunks
        except Exception as e:
            print(f"  [WARN] Error reading {file_path}: {e}")
            return []

    def walk_log_tensor(self) -> List[Dict]:
        """Walk LOG-Tensor directory and collect chunks"""
        all_chunks = []

        if not LOG_TENSOR_DIR.exists():
            print(f"[ERROR] LOG-Tensor directory not found: {LOG_TENSOR_DIR}")
            return []

        print(f"\n[INFO] Scanning LOG-Tensor files...")

        # File extensions to include
        extensions = {".md", ".ts", ".tsx", ".js", ".jsx", ".json", ".txt", ".py", ".yml", ".yaml"}

        for file_path in LOG_TENSOR_DIR.rglob("*"):
            if not file_path.is_file():
                continue

            if file_path.name in EXCLUDE_FILES or file_path.name.endswith(".log"):
                continue

            if file_path.suffix not in extensions:
                continue

            chunks = self.vectorize_file(file_path)
            if chunks:
                all_chunks.extend(chunks)
                self.file_count += 1
                self.chunk_count += len(chunks)
                try:
                    # Handle both ASCII and non-ASCII characters
                    safe_name = file_path.name.encode('ascii', 'ignore').decode('ascii')
                    print(f"  [OK] {safe_name} ({len(chunks)} chunks)")
                except Exception:
                    print(f"  [OK] [file] ({len(chunks)} chunks)")

        print(f"\n[OK] Scanned {self.file_count} LOG-Tensor files, created {self.chunk_count} chunks")
        return all_chunks

    def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """Generate embeddings for chunks"""
        print("\n[INFO] Generating embeddings for LOG-Tensor...")

        texts = [chunk["text"] for chunk in chunks]
        batch_size = 32
        all_embeddings = []
        start_time = time.time()

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            embeddings = self.model.encode(batch, show_progress_bar=False, convert_to_numpy=True)
            all_embeddings.extend(embeddings)
            print(f"  [OK] Embedded {min(i+batch_size, len(texts))}/{len(texts)} chunks", flush=True)

        for chunk, embedding in zip(chunks, all_embeddings):
            chunk["embedding"] = embedding.tolist()

        elapsed = time.time() - start_time
        print(f"[OK] Generated {len(chunks)} embeddings in {elapsed:.1f}s")

        return chunks

    def connect_qdrant(self) -> QdrantClient:
        """Connect to Qdrant"""
        print("\n[INFO] Connecting to Qdrant...")
        client = QdrantClient(
            host=VECTOR_DB_CONFIG["host"],
            port=VECTOR_DB_CONFIG["port"],
            check_compatibility=False
        )
        client.get_collections()
        print(f"[OK] Connected to Qdrant")
        return client

    def get_existing_count(self, client: QdrantClient) -> int:
        """Get existing vector count"""
        info = client.get_collection(VECTOR_DB_CONFIG["collection_name"])
        return info.points_count

    def upload_vectors(self, client: QdrantClient, chunks: List[Dict], start_id: int):
        """Upload vectors to Qdrant"""
        print(f"\n[INFO] Uploading {len(chunks)} LOG-Tensor vectors to Qdrant...")

        points = []
        for i, chunk in enumerate(chunks):
            point = PointStruct(
                id=start_id + i,
                vector=chunk["embedding"],
                payload={
                    "file": chunk["file"],
                    "text": chunk["text"][:500],
                    "start_pos": chunk["start_pos"],
                    "end_pos": chunk["end_pos"],
                    "size": chunk["size"],
                    "source": "LOG-Tensor"
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

        print(f"[OK] Uploaded all LOG-Tensor vectors")

    def update_metadata(self, chunks: List[Dict]):
        """Update metadata file"""
        metadata_file = PROJECT_ROOT / ".vectordb_metadata.json"

        if metadata_file.exists():
            with open(metadata_file, "r") as f:
                metadata = json.load(f)
        else:
            metadata = {}

        metadata["log_tensor_added"] = datetime.now().isoformat()
        metadata["log_tensor_file_count"] = self.file_count
        metadata["log_tensor_chunk_count"] = self.chunk_count
        metadata["total_with_log_tensor"] = metadata.get("chunk_count", 0) + self.chunk_count

        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\n[OK] Updated metadata")

    def run(self):
        """Main vectorization pipeline"""
        print("=" * 60)
        print("LOG-TENSOR VECTORIZATION")
        print("=" * 60)

        # Step 1: Walk LOG-Tensor and collect chunks
        chunks = self.walk_log_tensor()
        if not chunks:
            print("[ERROR] No chunks found to vectorize")
            return

        # Step 2: Generate embeddings
        chunks = self.embed_chunks(chunks)

        # Step 3: Connect to Qdrant
        client = self.connect_qdrant()

        # Step 4: Get existing count for offset
        existing_count = self.get_existing_count(client)
        print(f"[OK] Existing vectors: {existing_count}")

        # Step 5: Upload vectors with offset IDs
        self.upload_vectors(client, chunks, existing_count)

        # Step 6: Update metadata
        self.update_metadata(chunks)

        print("\n" + "=" * 60)
        print("[OK] LOG-TENSOR VECTORIZATION COMPLETE")
        print("=" * 60)
        print(f"\nAdded {self.chunk_count} LOG-Tensor vectors to unified search")
        print(f"Total vectors now: {existing_count + self.chunk_count}")


if __name__ == "__main__":
    vectorizer = LOGTensorVectorizer()
    vectorizer.run()
