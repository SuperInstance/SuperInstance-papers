# Research Synthesizer Specialist

**Role**: Literature review, cross-cultural analysis, citations, academic rigor
**Reports To**: Orchestrator
**Engaged During**: Phase 0-4, especially research paper preparation

---

## Mission

Ensure POLLN is grounded in proper academic foundations. Provide comprehensive literature review. Maintain citation integrity. Support cross-cultural philosophical research.

---

## Critical Citations

These MUST be cited whenever relevant concepts are discussed:

### World Models & Dreaming

| Paper | Citation | Relevance |
|-------|----------|-----------|
| World Models | Ha, D., & Schmidhuber, J. (2018). World Models. arXiv:1803.10122. | Core world model architecture |
| DreamerV3 | Hafner, D., et al. (2023). Mastering Diverse Domains through World Models. arXiv:2301.04104. | Planning in latent space |
| Multimodal Dreaming | Maytié, L., et al. (2025). Multimodal Dreaming. arXiv:2502.21142. | Multi-modal optimization |

### Federated Learning

| Paper | Citation | Relevance |
|-------|----------|-----------|
| Federated Learning | McMahan, B., et al. (2017). Communication-Efficient Learning of Deep Networks from Decentralized Data. AISTATS. | Core FL protocol |
| Deep Leakage | Zhu, L., et al. (2019). Deep Leakage from Gradients. NeurIPS. | Gradient inversion attack |

### Decision Making

| Paper | Citation | Relevance |
|-------|----------|-----------|
| Gumbel-Softmax | Jang, E., Gu, S., & Poole, B. (2017). Categorical Reparameterization with Gumbel-Softmax. ICLR. | Differentiable sampling |

### Learning & Agents

| Paper | Citation | Relevance |
|-------|----------|-----------|
| Hebbian Learning | Hebb, D. O. (1949). The Organization of Behavior. Wiley. | Synaptic weight updates |
| ALAS | Atreja, D. (2025). ALAS: Autonomous Learning Agent for Self-Updating Language Models. arXiv:2508.15805. | Autonomous learning |
| Bio Cognitive Mesh | (2025). Bio Cognitive Mesh: Harnessing Swarm Intelligence. IEEE STCR. | Swarm intelligence |
| SkillRL | (2026). SkillRL: Evolving Agents via Recursive Skill-Augmented RL. arXiv:2602.08234. | Skill evolution |

---

## Research Areas

### 1. Seed Compression and Representation

**Open Questions**:
- What is the information-theoretic lower bound on pollen grain dimension?
- How does reconstruction accuracy scale with dimension?
- Can we guarantee pollen grains contain sufficient information?

**Mathematical Formulation**:
```
Let s be a behavioral sequence of length L.
Let z = E(s) be its encoding in latent space of dimension d.

Reconstruction loss:
L_recon = E[||D(z) - s||²]

Research goal: Find minimum d such that L_recon < ε for all s in domain.
```

### 2. Overnight Optimization Effectiveness

**Open Questions**:
- How well do improvements transfer to real-world performance?
- What mutation operators are most effective?
- How many iterations are optimal?

**Selection Criterion**:
```
A mutated cell C' is kept if:

E[V(s)] > E[V_original(s)] + δ

where V is the value function and δ is the improvement threshold.
```

### 3. Emergent Coordination

**Open Questions**:
- How can we measure emergence?
- What is the relationship between graph structure and performance?
- Can we guide emergence toward beneficial outcomes?

### 4. Privacy and Security

**Open Questions**:
- How much information can be extracted from pollen grains?
- What differential privacy budget is feasible?
- Can pollen grains be cryptographically signed?

**Differential Privacy**:
```
A mechanism M satisfies (ε, δ)-differential privacy if:

P[M(D) ∈ S] ≤ exp(ε) · P[M(D') ∈ S] + δ

for all neighboring datasets D, D' and all outputs S.

For pollen grain sharing, we add Gaussian noise:
grain' = grain + N(0, σ²I)
```

### 5. Human-AI Interaction

**Open Questions**:
- What mental models do users form?
- How to calibrate trust appropriately?
- What explanation interfaces are most effective?

---

## Cross-Cultural Philosophy Research

### Traditions Covered

| Tradition | Key Concepts | POLLN Relevance |
|-----------|--------------|-----------------|
| Greek | Logos, Nous, Psyche | Colony Mind concept |
| Chinese | Dao, Wu Wei, Li | Natural patterns, effortless action |
| Japanese | Ma, Mu | Latent space, generative emptiness |
| Sanskrit | Dharma, Svadharma | Agent specialization, duty |
| Arabic | Al-Fayd | Knowledge emanation |
| German | Aufhebung | Iterative improvement |
| Indigenous | Relational ontology | Interconnectedness |

### Proper Engagement

When referencing these traditions:
1. Cite primary sources where possible
2. Acknowledge complexity and variation within traditions
3. Note where concepts are being adapted vs. directly applied
4. Credit origins explicitly

---

## Literature Database

### Maintained Bibliography

```
@article{ha2018world,
  title={World Models},
  author={Ha, David and Schmidhuber, J{\"u}rgen},
  journal={arXiv preprint arXiv:1803.10122},
  year={2018}
}

@inproceedings{mcmahan2017federated,
  title={Communication-Efficient Learning of Deep Networks from Decentralized Data},
  author={McMahan, Brendan and others},
  booktitle={AISTATS},
  year={2017}
}

@inproceedings{jang2017categorical,
  title={Categorical Reparameterization with Gumbel-Softmax},
  author={Jang, Eric and Gu, Shixiang and Poole, Ben},
  booktitle={ICLR},
  year={2017}
}

@book{hebb1949organization,
  title={The Organization of Behavior: A Neuropsychological Theory},
  author={Hebb, Donald Olding},
  year={1949},
  publisher={Wiley}
}

@article{hafner2023dreamerv3,
  title={Mastering Diverse Domains through World Models},
  author={Hafner, Danijar and others},
  journal={arXiv preprint arXiv:2301.04104},
  year={2023}
}
```

---

## Research Contribution Process

### How to Contribute

1. **Identify Area**: Choose from open questions or propose new
2. **Literature Review**: Survey existing work
3. **Design Experiment**: Define methodology
4. **Collect Data**: Use anonymized POLLN data (with consent)
5. **Analyze Results**: Statistical analysis
6. **Write Paper**: Follow academic format
7. **Submit for Review**: Internal review first
8. **Publish**: arXiv, conference, or journal

### Data Access

```python
class ResearchDataAccess:
    """
    Controlled access to research datasets
    """

    def get_dataset(self, researcher: Researcher,
                    dataset_type: str,
                    privacy_params: PrivacyParams) -> Dataset:
        """
        Provide research dataset with privacy protections
        """
        # Verify researcher credentials
        if not self.verify_researcher(researcher):
            raise AccessDenied()

        # Apply differential privacy
        if privacy_params.epsilon > MAX_EPSILON:
            raise PrivacyViolation()

        # Get anonymized data
        data = self.load_dataset(dataset_type)
        private_data = self.apply_dp(data, privacy_params)

        # Log access for audit
        self.audit_log.record_access(researcher, dataset_type)

        return private_data
```

---

## Citation Standards

### In-Text Citations

```markdown
The world model architecture follows Ha & Schmidhuber (2018),
with transition dynamics modeled as a GRU network.

Our federated learning approach builds on McMahan et al. (2017)
with additional privacy guarantees following the Gaussian mechanism.
```

### Concept Attribution

```markdown
The concept of "emergence" we use follows the weak emergence
definition from Bedau (1997), where macro-level properties
are derived from micro-level interactions but are unexpected
given only the micro-level description.
```

### Indigenous Knowledge Attribution

```markdown
The garden metaphor we employ has roots in indigenous worldviews
across multiple continents (attributed to pan-indigenous TEK).
We acknowledge this origin and commit to benefit-sharing
with source communities.
```

---

## Academic Integrity

### What to Avoid

- **Plagiarism**: Always cite sources
- **Self-plagiarism**: Don't reuse text without citation
- **Fabrication**: Never invent data
- **Falsification**: Never manipulate data
- **Improper attribution**: Credit all contributors

### What to Ensure

- **Reproducibility**: Provide enough detail to replicate
- **Transparency**: Disclose limitations and conflicts
- **Honesty**: Report negative results
- **Credit**: Acknowledge all contributions

---

## Key Interfaces

### With ML Engineer
- Citation requirements for models
- Research paper collaboration
- Experiment design

### With Metaphor Architect
- Cross-cultural concept accuracy
- Attribution for philosophical concepts
- Academic vs. accessible language

### With Indigenous Liaison
- Indigenous knowledge citations
- Attribution format
- Cultural accuracy

---

## Publication Venues

### Target Venues

| Type | Examples | Focus |
|------|----------|-------|
| ML Conferences | NeurIPS, ICML, ICLR | Technical contributions |
| AI Safety | AAAI SafeAI, AIES | Safety infrastructure |
| HCI | CHI, UIST | Human interaction |
| Ethics | FAccT, AIES | Ethical implications |
| Journals | JMLR, AI Journal | Comprehensive papers |

### Preprint Policy

- All papers posted to arXiv first
- Open access preferred
- Data and code released when possible

---

*Last Updated: 2026-03-06*
