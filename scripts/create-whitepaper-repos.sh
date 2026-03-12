#!/bin/bash
# Script to create separate repositories for each white paper
# These repos contain the paper + research data + simulations
# Main POLLN monorepo keeps everything integrated

REPOS=(
  "polln-whitepaper-ocds:Origin-Centric Data Systems"
  "polln-whitepaper-superinstance:SuperInstance Type System"
  "polln-whitepaper-confidence:Confidence Cascade Architecture"
  "polln-whitepaper-pythagorean:Pythagorean Geometric Tensors"
  "polln-whitepaper-smpbot:SMPbot Architecture"
  "polln-whitepaper-tilealgebra:Tile Algebra Formalization"
  "polln-whitepaper-ratebased:Rate-Based Change Mechanics"
  "polln-whitepaper-laminar:Laminar vs Turbulent Systems"
  "polln-whitepaper-wigner:Wigner-D Harmonics for SO(3)"
  "polln-whitepaper-gpu:GPU Scaling Architecture"
)

echo "Creating white paper repositories..."
echo "Each repo will contain:"
echo "  - The white paper (LaTeX + PDF)"
echo "  - Research data and notes"
echo "  - Simulation code and results"
echo "  - References and bibliography"
echo ""

for repo_info in "${REPOS[@]}"; do
  IFS=':' read -r repo_name description <<< "$repo_info"
  echo "Creating: $repo_name - $description"

  # Create repo structure
  mkdir -p "../$repo_name"
  cd "../$repo_name" || exit

  # Initialize git
  git init

  # Create README
  cat > README.md << EOF
# $description

This repository contains the standalone white paper, research data, and simulations for:
**$description**

Part of the POLLN (Pattern-Oriented Local Ledger Notation) ecosystem.

## Repository Structure

\`\`\`
├── paper/              # LaTeX source and compiled PDF
├── research/           # Research notes and data
├── simulations/        # Simulation code and results
├── references/         # Bibliography and citations
└── data/              # Raw and processed data
\`\`\`

## Main Project

This white paper is part of the larger POLLN ecosystem:
- **Main Repository**: https://github.com/SuperInstance/polln
- **Website**: https://superinstance.ai
- **Ecosystem**: https://github.com/SuperInstance

## Citation

If you use this work, please cite:

\`\`\`bibtex
@techreport{polln2026$(echo $repo_name | sed 's/polln-whitepaper-//')},
  title={$description},
  author={DiGennaro, Casey and POLLN Research Team},
  year={2026},
  url={https://github.com/SuperInstance/$repo_name}
}
\`\`\`

## License

MIT License - See LICENSE file
EOF

  # Create directory structure
  mkdir -p paper research simulations references data

  # Create .gitignore
  cat > .gitignore << EOF
# LaTeX
*.aux
*.log
*.out
*.toc
*.synctex.gz
*.fdb_latexmk
*.fls

# Data
*.csv
*.json
!example-*.json

# Results
results/
*.png
!figures/*.png

# Environment
.env
node_modules/
EOF

  # Create LICENSE
  cat > LICENSE << EOF
MIT License

Copyright (c) 2026 Casey DiGennaro and POLLN Research Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
EOF

  # Initial commit
  git add .
  git commit -m "Initial commit: $description white paper repository"

  echo "Created: $repo_name"
  echo ""
  cd - || exit
done

echo "All white paper repositories created!"
echo ""
echo "Next steps:"
echo "1. Copy relevant content from POLLN monorepo to each repo"
echo "2. Push to GitHub:"
echo "   gh repo create SuperInstance/<repo-name> --public"
echo "   git push origin main"
