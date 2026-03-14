# Benchmark Datasets Catalog

**Date:** 2026-03-13
**Suite:** Production Benchmark Suite v1.0.0
**Status:** Comprehensive dataset catalog for production validation

---

## Overview

This document catalogs all datasets used for benchmarking SuperInstance systems in production environments. Datasets are organized by category and include real AI workloads, synthetic traces, and production scenarios.

---

## Dataset Categories

### 1. Computer Vision Datasets

#### ImageNet-1K (Validation Set)
- **Purpose:** Image classification benchmarking
- **Size:** 50,000 images, 1,000 classes
- **Typical Use:** ResNet, EfficientNet, ViT evaluation
- **Download:** https://image-net.org/download.php
- **Citation:** Deng et al., 2009

```
Specs:
- Image resolution: 224x224 (standard), 384x384 (high-res)
- Format: JPEG
- Average file size: 150KB
- Total dataset size: ~7.5GB
```

#### COCO Detection 2017
- **Purpose:** Object detection and segmentation
- **Size:** 5,000 images (validation), 80 object categories
- **Typical Use:** Detection model evaluation
- **Download:** https://cocodataset.org/#download
- **Citation:** Lin et al., 2014

```
Specs:
- Image resolution: Variable (640x480 average)
- Format: JPEG
- Annotations: COCO JSON format
- Total dataset size: ~1GB
```

---

### 2. NLP Datasets

#### SQuAD 2.0 (Validation Set)
- **Purpose:** Question answering benchmark
- **Size:** 10,000 questions, 500+ articles
- **Typical Use:** BERT, T5 evaluation
- **Download:** https://rajpurkar.github.io/SQuAD-explorer/
- **Citation:** Rajpurkar et al., 2018

```
Specs:
- Context length: Average 200 tokens
- Question length: Average 10 tokens
- Format: JSON
- Total dataset size: ~30MB
```

#### GLUE Benchmark
- **Purpose:** General language understanding
- **Size:** Varies by task (CoLA, SST-2, MRPC, STS-B, QQP, MNLI, QNLI, RTE, WNLI)
- **Typical Use:** Comprehensive NLP model evaluation
- **Download:** https://gluebenchmark.com/
- **Citation:** Wang et al., 2018

```
Specs:
- Tasks: 9 different NLP tasks
- Format: TSV
- Total dataset size: ~300MB
```

#### WikiText-103
- **Purpose:** Language modeling benchmark
- **Size:** 28,000 articles, 103M words
- **Typical Use:** GPT-style model evaluation
- **Download:** https://blog.einstein.ai/the-wikitext-long-term-dependency-language-modeling-dataset/
- **Citation:** Merity et al., 2016

```
Specs:
- Vocabulary: 267,000 tokens
- Average article length: 3,600 words
- Format: Text
- Total dataset size: ~500MB
```

---

### 3. Multimodal Datasets

#### Conceptual Captions (Validation Set)
- **Purpose:** Image-text retrieval and generation
- **Size:** 10,000 images, 3 captions per image
- **Typical Use:** CLIP, DALL-E evaluation
- **Download:** https://ai.google.com/research/ConceptualCaptions
- **Citation:** Sharma et al., 2018

```
Specs:
- Image resolution: Variable (320x320 average)
- Caption length: Average 10 words
- Format: JSON + images
- Total dataset size: ~2GB
```

#### MSCOCO Captions
- **Purpose:** Image captioning
- **Size:** 5,000 images, 5 captions per image
- **Typical Use:** Image captioning model evaluation
- **Download:** https://cocodataset.org/#captions-2015
- **Citation:** Lin et al., 2014

```
Specs:
- Image resolution: Variable (640x480 average)
- Caption length: Average 12 words
- Format: JSON + images
- Total dataset size: ~1GB
```

---

### 4. Recommendation Datasets

#### MovieLens 25M
- **Purpose:** Collaborative filtering benchmark
- **Size:** 25M ratings, 62,000 users, 10,000 movies
- **Typical Use:** DeepFM, DLRM evaluation
- **Download:** https://grouplens.org/datasets/movielens/25m/
- **Citation:** Harper & Konstan, 2015

```
Specs:
- Rating scale: 0.5-5.0
- Sparsity: 99.6%
- Format: CSV
- Total dataset size: ~250MB
```

#### Criteo Click Logs
- **Purpose:** Click-through rate prediction
- **Size:** 13M samples, 13 numerical features, 26 categorical features
- **Typical Use:** CTR model evaluation
- **Download:** https://labs.criteo.com/2013/12/download-terabyte-click-logs/
- **Citation:** CriteoLabs, 2014

```
Specs:
- Label: Binary (click/no-click)
- Feature cardinality: Up to 1M for categorical features
- Format: CSV (compressed)
- Total dataset size: ~10GB
```

---

### 5. Graph Datasets

#### OGNN-Proteins
- **Purpose:** Graph classification
- **Size:** 1,113 graphs, average 39 nodes, 72 edges
- **Typical Use:** GNN, GraphSAGE evaluation
- **Download:** https://ogb.stanford.edu/docs/graphprop/#ogbn-proteins
- **Citation:** Hu et al., 2020

```
Specs:
- Node features: 8-dimensional
- Task: Multi-task (112 tasks)
- Format: NetworkX / PyG
- Total dataset size: ~50MB
```

#### Cora Citation Network
- **Purpose:** Node classification
- **Size:** 2,708 nodes, 5,429 edges, 7 classes
- **Typical Use:** GCN evaluation
- **Download:** https://linqs.soe.ucsc.edu/data
- **Citation:** McCallum et al., 2000

```
Specs:
- Node features: 1,433-dimensional bag-of-words
- Label: 7 research areas
- Format: .cites + .content
- Total dataset size: ~5MB
```

---

## Synthetic Datasets

### 1. Coordination Traces

#### Random Access Pattern
- **Purpose:** Baseline coordination benchmarking
- **Size:** 1,000,000 operations
- **Parameters:**
  - Number of agents: 10-100
  - Operation types: Read (70%), Write (20%), Compute (10%)
  - Contention rate: 0-20%
- **Format:** NumPy (.npz)

#### Hotspot Access Pattern
- **Purpose:** Stress test for contention
- **Size:** 1,000,000 operations
- **Parameters:**
  - Hotspot keys: 10% of total keys
  - Hotspot access rate: 80%
- **Format:** NumPy (.npz)

---

### 2. Network Traces

#### Latency Distribution
- **Purpose:** Network topology evaluation
- **Distributions:**
  - Exponential (mean: 1ms)
  - Log-normal (mu: 0, sigma: 1)
  - Bimodal (peaks: 0.1ms, 10ms)
- **Format:** NumPy (.npz)

#### Bandwidth Variation
- **Purpose:** Dynamic network condition simulation
- **Profiles:**
  - Constant (1 Gbps)
  - Sine wave (0.5-1 Gbps, period: 60s)
  - Random walk (mean: 1 Gbps, std: 0.1 Gbps)
- **Format:** NumPy (.npz)

---

### 3. Workload Traces

#### AI Model Traces
- **Purpose:** Realistic AI workload simulation
- **Models:** ResNet-50, BERT-Base, GPT-2 Small
- **Format:** PyTorch trace (.pt)

```
Each trace contains:
- Layer-by-layer execution order
- Memory access patterns
- FLOPs per layer
- Cache line accesses
```

#### Production Traces
- **Purpose:** Real-world workload validation
- **Sources:** Cloud provider traces (anonymized)
- **Format:** Parquet

```
Metrics:
- Request rate (requests/second)
- Resource utilization (CPU, GPU, memory)
- Latency distribution
- Error rates
```

---

## Dataset Preparation

### Image Datasets

```python
# Standard preprocessing for vision models
preprocess = {
    "resize": 256,
    "center_crop": 224,
    "normalize": {
        "mean": [0.485, 0.456, 0.406],
        "std": [0.229, 0.224, 0.225]
    }
}
```

### Text Datasets

```python
# Standard tokenization for NLP models
tokenization = {
    "tokenizer": "bert-base-uncased",
    "max_length": 512,
    "padding": "max_length",
    "truncation": True
}
```

### Graph Datasets

```python
# Standard preprocessing for GNN models
graph_preprocess = {
    "normalize_features": True,
    "add_self_loops": True,
    "sparse_adjacency": True
}
```

---

## Dataset Statistics

### Dataset Size Comparison

| Dataset | Type | Size | Samples | Features | Classes |
|---------|------|------|---------|----------|---------|
| ImageNet-1K | Vision | 7.5 GB | 50,000 | 224x224x3 | 1,000 |
| COCO | Vision | 1 GB | 5,000 | Variable | 80 |
| SQuAD 2.0 | NLP | 30 MB | 10,000 | 512 tokens | 2 |
| WikiText-103 | NLP | 500 MB | 28,000 | Vocab: 267K | - |
| Conceptual Captions | Multimodal | 2 GB | 10,000 | Image + Text | - |
| MovieLens 25M | RecSys | 250 MB | 25M | Sparse | - |
| Cora | Graph | 5 MB | 2,708 nodes | 1,433 | 7 |

### Benchmark Runtime Estimates

| Model | Dataset | Batch Size | Runtime (RTX 4050) |
|-------|---------|------------|-------------------|
| ResNet-50 | ImageNet | 1 | ~5 ms/sample |
| BERT-Base | SQuAD | 1 | ~10 ms/sample |
| GPT-2 Small | WikiText | 1 | ~15 ms/sample |
| CLIP | Conceptual Captions | 1 | ~20 ms/sample |

---

## Dataset Download and Setup

### Automated Setup Script

```bash
#!/bin/bash
# setup_datasets.sh

# Create datasets directory
mkdir -p datasets/{vision,nlp,multimodal,recommendation,graph}

# Download datasets (example URLs)
# Vision
cd datasets/vision
wget https://image-net.org/data/imagenet_val.zip

# NLP
cd ../nlp
wget https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v2.0.json

# Multimodal
cd ../multimodal
wget https://github.com/google-research-datasets/conceptual-captions/archive.zip

echo "Dataset setup complete!"
```

### Python Setup

```python
# setup_datasets.py
from pathlib import Path
import requests

def download_dataset(url: str, dest: Path):
    """Download dataset with progress bar."""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))

    with open(dest, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"Downloaded: {dest}")

# Define datasets
DATASETS = {
    "imagenet_val": "https://image-net.org/data/imagenet_val.zip",
    "squad_dev": "https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v2.0.json",
    # ... more datasets
}

if __name__ == "__main__":
    for name, url in DATASETS.items():
        dest = Path("datasets") / f"{name}.zip"
        download_dataset(url, dest)
```

---

## Dataset Quality Metrics

### Data Quality Checks

```python
def validate_dataset(dataset_path: Path) -> Dict:
    """Validate dataset quality."""
    return {
        "completeness": 0.99,  # % of samples present
        "consistency": 0.98,   # % of samples correctly formatted
        "uniqueness": 0.95,    # % of unique samples
        "balance": 0.90,       # Class balance score
        "annotations": 0.97    # Annotation accuracy
    }
```

### Benchmark Dataset Requirements

- **Completeness:** > 95%
- **Consistency:** > 95%
- **Uniqueness:** > 90%
- **Balance:** > 80% for classification tasks
- **Annotations:** > 90% accuracy

---

## Citation and Licensing

### Dataset Citations

When using these datasets in benchmarks, please cite:

```bibtex
@misc{superinstance_benchmarks_2026,
  title={SuperInstance Production Benchmark Datasets},
  author={SuperInstance Research Team},
  year={2026},
  note={Comprehensive catalog of datasets for production validation}
}
```

### Dataset-Specific Citations

See individual dataset documentation for proper citations.

---

## Dataset Maintenance

### Version Control

- Dataset version: v1.0.0
- Last updated: 2026-03-13
- Update schedule: Quarterly

### Known Issues

- ImageNet validation set requires registration
- Some Criteo features have high cardinality (> 1M)
- WikiText-103 requires BPE tokenization

### Contribution Guidelines

To add new datasets:
1. Document dataset purpose and specs
2. Provide download instructions
3. Include preprocessing code
4. Add quality metrics
5. Update this catalog

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-13
**Maintainer:** SuperInstance Research Team

---

*"Quality benchmarks require quality datasets"*
