# White Paper Repository Strategy

## Overview

Each white paper has its own dedicated repository for long-term stability, while the complete integrated project remains in the POLLN monorepo.

## Repository Structure

| Repository | White Paper | Status | Location |
|------------|-------------|--------|----------|
| `polln-whitepaper-ocds` | Origin-Centric Data Systems | ✅ Complete | `../polln-whitepaper-ocds/` |
| `polln-whitepaper-superinstance` | SuperInstance Type System | ✅ Complete | `../polln-whitepaper-superinstance/` |
| `polln-whitepaper-confidence` | Confidence Cascade Architecture | ✅ Complete | `../polln-whitepaper-confidence/` |
| `polln-whitepaper-pythagorean` | Pythagorean Geometric Tensors | ✅ Complete | `../polln-whitepaper-pythagorean/` |
| `polln-whitepaper-smpbot` | SMPbot Architecture | 📝 Planned | Future |
| `polln-whitepaper-tilealgebra` | Tile Algebra Formalization | 📝 Planned | Future |
| `polln-whitepaper-ratebased` | Rate-Based Change Mechanics | 📝 Planned | Future |
| `polln-whitepaper-laminar` | Laminar vs Turbulent Systems | 📝 Planned | Future |
| `polln-whitepaper-wigner` | Wigner-D Harmonics for SO(3) | 📝 Planned | Future |
| `polln-whitepaper-gpu` | GPU Scaling Architecture | 📝 Planned | Future |

## Repository Contents

Each white paper repository contains:

```
polln-whitepaper-<name>/
├── README.md              # Overview and citation info
├── LICENSE                # MIT License
├── .gitignore            # LaTeX and data exclusions
├── paper/                # LaTeX source and PDF
│   ├── main.tex
│   ├── sections/
│   ├── figures/
│   └── paper.pdf
├── research/             # Research notes and data
│   ├── notes.md
│   ├── data/
│   └── analysis/
├── simulations/          # Simulation code and results
│   ├── src/
│   ├── results/
│   └── README.md
├── references/           # Bibliography
│   ├── references.bib
│   └── related-work.md
└── data/                 # Raw and processed data
    ├── raw/
    └── processed/
```

## Synchronization Strategy

### From POLLN to White Paper Repos

When a white paper is updated in POLLN:

1. Copy updated paper from `white-papers/` to `paper/`
2. Copy related research from `docs/research/`
3. Copy simulations from `src/benchmarks/` or relevant locations
4. Commit and tag with version

### From White Paper Repos to POLLN

When research advances in a dedicated repo:

1. Copy new findings to `docs/research/` in POLLN
2. Update paper in `white-papers/`
3. Integrate simulations into main codebase
4. Commit to monorepo

## GitHub URLs

- https://github.com/SuperInstance/polln-whitepaper-ocds
- https://github.com/SuperInstance/polln-whitepaper-superinstance
- https://github.com/SuperInstance/polln-whitepaper-confidence
- https://github.com/SuperInstance/polln-whitepaper-pythagorean
- (etc. for remaining papers)

## Citation

Each repository includes citation information:

```bibtex
@techreport{polln2026ocds,
  title={Origin-Centric Data Systems},
  author={DiGennaro, Casey and POLLN Research Team},
  year={2026},
  url={https://github.com/SuperInstance/polln-whitepaper-ocds}
}
```

## Creation Script

Run `scripts/create-whitepaper-repos.sh` to create all repositories locally.

## Long-term Stability

- **Monorepo (POLLN)**: Active development, integration, complete ecosystem
- **White Paper Repos**: Stable snapshots, research preservation, academic citation
- **Both**: Cross-referenced, synchronized on major releases
