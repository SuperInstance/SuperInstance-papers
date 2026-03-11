#!/usr/bin/env python3
"""
MCP Server: POLLN Codebase Vector Search
Enables Claude Code and Claude to search vectorized codebase semantically
Integration: Callable from Claude Code via @codebase-search command
"""

import json
import sys
from pathlib import Path
from typing import List, Tuple

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Installing sentence-transformers...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers"])
    from sentence_transformers import SentenceTransformer

try:
    from qdrant_client import QdrantClient
except ImportError:
    print("Installing qdrant-client...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qdrant-client"])
    from qdrant_client import QdrantClient

# Qdrant configuration (must match vectorization_setup.py)
QDRANT_CONFIG = {
    "host": "localhost",
    "port": 6333,
    "collection_name": "polln-codebase",
    "model_name": "all-MiniLM-L6-v2",
}

class CodebaseSearchEngine:
    """Semantic search engine for vectorized codebase"""

    def __init__(self):
        # GPU acceleration setup with ONNX Runtime
        self.device = self._detect_device()

        # Initialize model with GPU if available
        self.gpu_enabled = False
        if self.device == "cuda":
            # Check if PyTorch CUDA is actually available
            try:
                import torch
                if torch.cuda.is_available():
                    print("[OK] Using GPU for search acceleration (PyTorch CUDA)")
                    self.model = SentenceTransformer(QDRANT_CONFIG["model_name"], device="cuda")
                    self.gpu_enabled = True
                else:
                    print("[INFO] ONNX Runtime CUDA detected but PyTorch CUDA not available")
                    self.model = SentenceTransformer(QDRANT_CONFIG["model_name"])
            except ImportError:
                print("[INFO] PyTorch not available")
                self.model = SentenceTransformer(QDRANT_CONFIG["model_name"])
        else:
            self.model = SentenceTransformer(QDRANT_CONFIG["model_name"])

        if not self.gpu_enabled:
            print("[INFO] Using CPU for search")

        self.client = None
        self._connect()

    def _detect_device(self) -> str:
        """Detect and return available device (cuda or cpu)"""
        try:
            import onnxruntime as rt
            providers = rt.get_available_providers()
            if 'CUDAExecutionProvider' in providers:
                print("[OK] ONNX Runtime CUDA available for search")
                return "cuda"
        except ImportError:
            pass
        except Exception as e:
            print(f"[WARN] ONNX Runtime detection failed: {e}")

        # Fallback to PyTorch CUDA check
        try:
            import torch
            if torch.cuda.is_available():
                device_name = torch.cuda.get_device_name(0)
                print(f"[OK] GPU available for search: {device_name}")
                return "cuda"
        except ImportError:
            pass
        except Exception as e:
            print(f"[WARN] GPU detection failed: {e}")

        return "cpu"

    def _connect(self) -> bool:
        """Connect to Qdrant database"""
        try:
            self.client = QdrantClient(
                host=QDRANT_CONFIG["host"],
                port=QDRANT_CONFIG["port"]
            )
            # Test connection
            self.client.get_collections()
            return True
        except Exception as e:
            print(f"Error connecting to Qdrant: {e}")
            print(f"Make sure Qdrant is running:")
            print(f"  docker run -d --name qdrant -p 6333:6333 qdrant/qdrant")
            return False

    def search(self, query: str, top_k: int = 5, threshold: float = 0.3) -> List[dict]:
        """
        Search codebase semantically

        Args:
            query: Search query (natural language)
            top_k: Number of results to return
            threshold: Minimum similarity score (0-1)

        Returns:
            List of search results with file, similarity, and preview
        """
        if not self.client:
            return [{"error": "Not connected to vector database"}]

        try:
            # Generate query embedding
            query_embedding = self.model.encode(query).tolist()

            # Use gRPC search method
            from qdrant_client.models import PointIdsList
            results = self.client.search(
                collection_name=QDRANT_CONFIG["collection_name"],
                query_vector=query_embedding,
                limit=top_k,
                with_payload=True
            )

            # Format results
            formatted_results = []
            for result in results:
                if hasattr(result, 'score') and result.score >= threshold:
                    payload = result.payload if hasattr(result, 'payload') else {}
                    formatted_results.append({
                        "file": payload.get("file", "unknown") if isinstance(payload, dict) else "unknown",
                        "similarity": round(float(result.score), 3) if hasattr(result, 'score') else 0.0,
                        "preview": (payload.get("text", "") if isinstance(payload, dict) else "")[:300],
                        "start_pos": payload.get("start_pos", 0) if isinstance(payload, dict) else 0,
                    })

            return formatted_results if formatted_results else [{"error": "No results found"}]

        except AttributeError as e:
            # Fall back to using urllib for REST API
            try:
                import urllib.request
                import json

                query_embedding = self.model.encode(query).tolist()

                request_data = {
                    "vector": query_embedding,
                    "limit": top_k,
                    "with_payload": True
                }

                req = urllib.request.Request(
                    f"http://{QDRANT_CONFIG['host']}:{QDRANT_CONFIG['port']}/collections/{QDRANT_CONFIG['collection_name']}/points/search",
                    data=json.dumps(request_data).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )

                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode('utf-8'))

                formatted_results = []
                for result in data.get('result', []):
                    score = result.get('score', 0)
                    if score >= threshold:
                        payload = result.get('payload', {})
                        formatted_results.append({
                            "file": payload.get("file", "unknown"),
                            "similarity": round(score, 3),
                            "preview": payload.get("text", "")[:300],
                            "start_pos": payload.get("start_pos", 0),
                        })

                return formatted_results if formatted_results else [{"error": "No results found"}]
            except Exception as fallback_error:
                return [{"error": f"Search failed: {str(e)}, fallback error: {str(fallback_error)}"}]

        except Exception as e:
            return [{"error": f"Search failed: {str(e)}"}]

    def get_file_context(self, file_path: str) -> dict:
        """Get all chunks from a specific file"""
        if not self.client:
            return {"error": "Not connected to vector database"}

        try:
            # Search for file content
            results = self.client.scroll(
                collection_name=QDRANT_CONFIG["collection_name"],
                limit=100,
                query_filter={
                    "must": [
                        {
                            "key": "file",
                            "match": {"value": file_path}
                        }
                    ]
                }
            )

            chunks = []
            for point in results[0]:
                chunks.append({
                    "text": point.payload.get("text", ""),
                    "start_pos": point.payload.get("start_pos", 0),
                })

            return {
                "file": file_path,
                "chunks_count": len(chunks),
                "chunks": chunks
            }
        except Exception as e:
            return {"error": f"Failed to get file context: {str(e)}"}

    def get_stats(self) -> dict:
        """Get database statistics"""
        if not self.client:
            return {"error": "Not connected to vector database"}

        try:
            collection_info = self.client.get_collection(
                QDRANT_CONFIG["collection_name"]
            )
            return {
                "collection": QDRANT_CONFIG["collection_name"],
                "vectors_count": collection_info.points_count,
                "model": QDRANT_CONFIG["model_name"],
                "status": "ready"
            }
        except Exception as e:
            return {"error": f"Failed to get stats: {str(e)}"}


# Global search engine instance
search_engine = CodebaseSearchEngine()


# ============================================================================
# MCP Server Implementation (for Claude Code integration)
# ============================================================================

import asyncio
import json
from typing import Any

class SimpleServer:
    """Minimal MCP-compatible server for Claude Code"""

    def __init__(self):
        self.tools = {
            "search_codebase": self.search_codebase,
            "get_file_context": self.get_file_context,
            "get_vector_db_stats": self.get_vector_db_stats,
        }

    async def search_codebase(self, query: str, top_k: int = 5) -> str:
        """Search the vectorized codebase"""
        results = search_engine.search(query, top_k=top_k)
        return json.dumps({
            "query": query,
            "results": results,
            "count": len(results)
        }, indent=2)

    async def get_file_context(self, file_path: str) -> str:
        """Get all chunks from a specific file"""
        result = search_engine.get_file_context(file_path)
        return json.dumps(result, indent=2)

    async def get_vector_db_stats(self) -> str:
        """Get vector database statistics"""
        stats = search_engine.get_stats()
        return json.dumps(stats, indent=2)

    async def handle_request(self, request: dict) -> dict:
        """Handle incoming request"""
        tool_name = request.get("tool")
        args = request.get("arguments", {})

        if tool_name not in self.tools:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            tool_func = self.tools[tool_name]
            result = await tool_func(**args)
            return {"result": result}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}


# ============================================================================
# CLI Interface (for testing and standalone use)
# ============================================================================

def run_cli():
    """Interactive CLI for vector search"""
    print("\n" + "=" * 60)
    print("POLLN CODEBASE VECTOR SEARCH")
    print("=" * 60)

    # Show stats
    stats = search_engine.get_stats()
    if "error" not in stats:
        print(f"\n[OK] Connected to vector database")
        print(f"  Collection: {stats['collection']}")
        print(f"  Vectors: {stats['vectors_count']}")
        print(f"  Model: {stats['model']}")
    else:
        print(f"\n[ERROR] {stats['error']}")
        return

    # Interactive search
    print("\nEnter search queries (or 'quit' to exit):")
    print("Syntax: search <query> | file <path> | stats\n")

    while True:
        try:
            user_input = input(">>> ").strip()

            if not user_input:
                continue

            if user_input.lower() == "quit":
                break

            if user_input.lower() == "stats":
                stats = search_engine.get_stats()
                print(json.dumps(stats, indent=2))
                continue

            if user_input.startswith("file "):
                file_path = user_input[5:].strip()
                context = search_engine.get_file_context(file_path)
                print(json.dumps(context, indent=2))
                continue

            if user_input.startswith("search "):
                query = user_input[7:].strip()
            else:
                query = user_input

            results = search_engine.search(query)

            print(f"\n[RESULTS] Results for: '{query}'")
            for i, result in enumerate(results, 1):
                if "error" in result:
                    print(f"\n[ERROR] Error: {result['error']}")
                else:
                    print(f"\n{i}. {result['file']} (similarity: {result['similarity']})")
                    print(f"   {result['preview'][:100]}...")

            print()

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}\n")

    print("\nGoodbye!")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command-line mode
        if sys.argv[1] == "search":
            query = " ".join(sys.argv[2:])
            results = search_engine.search(query)
            print(json.dumps(results, indent=2))
        elif sys.argv[1] == "stats":
            stats = search_engine.get_stats()
            print(json.dumps(stats, indent=2))
        else:
            print("Usage: mcp_codebase_search.py [search <query> | stats] or run interactively")
    else:
        # Interactive CLI
        run_cli()
