"""
Phenomenon Catalog and Database

Maintains a comprehensive catalog of discovered emergent phenomena.
Supports search, comparison, and export for publication.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional, Set
from dataclasses import dataclass, field
from pathlib import Path
import json
from datetime import datetime
import hashlib
from difflib import SequenceMatcher
import re


@dataclass
class PhenomenonEntry:
    """Entry in phenomenon catalog"""
    entry_id: str
    name: str
    short_name: str
    description: str
    discovery_date: str
    discoverer: str  # Could be "automated" or person's name
    category: str
    tags: List[str]

    # Characterization
    features: Dict[str, float]
    computational_signature: Dict[str, Any]
    phase_space_location: Optional[Dict[str, Tuple[float, float]]]

    # Mechanism
    hypothesized_mechanism: Optional[str]
    confidence_in_mechanism: float
    alternative_mechanisms: List[str]

    # Mathematical characterization
    mathematical_model: Optional[str]
    critical_exponents: Optional[Dict[str, float]]
    scaling_laws: List[str]

    # Empirical support
    supporting_experiments: List[str]
    replication_status: str  # "replicated", "partially_replicated", "unreplicated"
    robustness_score: float

    # Novelty assessment
    novelty_score: float
    similarity_to_known: Dict[str, float]  # phenomenon_id: similarity
    uniqueness_claims: List[str]

    # Theoretical significance
    theoretical_importance: float
    practical_applications: List[str]
    related_theories: List[str]

    # Publication status
    publication_ready: bool
    publication_notes: str

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SignatureMatch:
    """Result of signature matching query"""
    phenomenon_id: str
    phenomenon_name: str
    similarity_score: float
    matching_features: List[str]
    non_matching_features: List[str]
    notes: str


class PhenomenonCatalog:
    """
    Comprehensive catalog of emergent phenomena

    Maintains database of discoveries, supports search and comparison,
    and prepares phenomena for publication.
    """

    def __init__(self, catalog_path: str = "./phenomenon_catalog"):
        self.catalog_path = Path(catalog_path)
        self.catalog_path.mkdir(parents=True, exist_ok=True)

        self.entries: Dict[str, PhenomenonEntry] = {}
        self.tag_index: Dict[str, Set[str]] = {}  # tag -> set of entry_ids
        self.category_index: Dict[str, Set[str]] = {}  # category -> set of entry_ids

        # Load existing catalog
        self._load_catalog()

    def add_entry(self, entry: PhenomenonEntry) -> None:
        """Add entry to catalog"""
        self.entries[entry.entry_id] = entry

        # Update indices
        for tag in entry.tags:
            if tag not in self.tag_index:
                self.tag_index[tag] = set()
            self.tag_index[tag].add(entry.entry_id)

        if entry.category not in self.category_index:
            self.category_index[entry.category] = set()
        self.category_index[entry.category].add(entry.entry_id)

        print(f"📝 Added entry: {entry.short_name} ({entry.entry_id})")

        # Save
        self._save_catalog()

    def create_entry_from_discovery(self,
                                   discovery_data: Dict[str, Any],
                                   name: str,
                                   short_name: str,
                                   category: str) -> PhenomenonEntry:
        """
        Create catalog entry from discovery data

        Args:
            discovery_data: Data about the discovery
            name: Full name of phenomenon
            short_name: Short identifier
            category: Category

        Returns:
            PhenomenonEntry object
        """
        # Generate unique ID
        entry_id = self._generate_entry_id(short_name)

        # Extract features
        features = discovery_data.get("features", {})
        signature = discovery_data.get("signature", {})

        # Generate tags from description and features
        description = discovery_data.get("description", "")
        tags = self._generate_tags(description, features, category)

        # Assess novelty
        novelty_score = self._assess_novelty(features, signature)

        # Find similar phenomena
        similar_phenomena = self._find_similar(entry_id, features)

        # Create entry
        entry = PhenomenonEntry(
            entry_id=entry_id,
            name=name,
            short_name=short_name,
            description=description,
            discovery_date=datetime.now().isoformat(),
            discoverer="automated",
            category=category,
            tags=tags,
            features=features,
            computational_signature=signature,
            phase_space_location=discovery_data.get("phase_space_location"),
            hypothesized_mechanism=discovery_data.get("mechanism"),
            confidence_in_mechanism=discovery_data.get("mechanism_confidence", 0.5),
            alternative_mechanisms=discovery_data.get("alternative_mechanisms", []),
            mathematical_model=discovery_data.get("mathematical_model"),
            critical_exponents=discovery_data.get("critical_exponents"),
            scaling_laws=discovery_data.get("scaling_laws", []),
            supporting_experiments=discovery_data.get("supporting_experiments", []),
            replication_status="unreplicated",
            robustness_score=discovery_data.get("robustness", 0.5),
            novelty_score=novelty_score,
            similarity_to_known=similar_phenomena,
            uniqueness_claims=discovery_data.get("uniqueness_claims", []),
            theoretical_importance=discovery_data.get("theoretical_importance", 0.5),
            practical_applications=discovery_data.get("applications", []),
            related_theories=discovery_data.get("related_theories", []),
            publication_ready=False,
            publication_notes=""
        )

        # Add to catalog
        self.add_entry(entry)

        return entry

    def _generate_entry_id(self, short_name: str) -> str:
        """Generate unique entry ID"""
        # Create base ID from short name
        base = short_name.lower().replace(" ", "_").replace("-", "_")
        base = re.sub(r'[^a-z0-9_]', '', base)

        # Check if exists
        if base not in self.entries:
            return base

        # Add suffix if needed
        counter = 1
        while f"{base}_{counter}" in self.entries:
            counter += 1

        return f"{base}_{counter}"

    def _generate_tags(self, description: str, features: Dict, category: str) -> List[str]:
        """Generate tags from phenomenon data"""
        tags = set()

        # Add category
        tags.add(category)

        # Extract keywords from description
        keywords = [
            "phase transition", "criticality", "synchronization", "coordination",
            "emergence", "self-organization", "collective", "swarm", "flocking",
            "consensus", "network", "pattern", "oscillation", "bifurcation",
            "tipping point", "threshold", "cascade", "percolation", "critical slowing"
        ]

        description_lower = description.lower()
        for keyword in keywords:
            if keyword in description_lower:
                tags.add(keyword.replace(" ", "_"))

        # Add feature-based tags
        for feature_name, feature_value in features.items():
            if feature_value > 0.8:
                tags.add(f"high_{feature_name}")
            elif feature_value < 0.2:
                tags.add(f"low_{feature_name}")

        return list(tags)

    def _assess_novelty(self, features: Dict, signature: Dict) -> float:
        """Assess novelty of phenomenon"""
        if not self.entries:
            return 1.0

        # Compare to existing entries
        max_similarity = 0.0

        for entry in self.entries.values():
            similarity = self._compute_feature_similarity(features, entry.features)
            max_similarity = max(max_similarity, similarity)

        # Novelty is inverse of maximum similarity
        novelty = 1.0 - max_similarity
        return novelty

    def _find_similar(self, entry_id: str, features: Dict) -> Dict[str, float]:
        """Find similar phenomena"""
        similar = {}

        for other_id, other_entry in self.entries.items():
            if other_id == entry_id:
                continue

            similarity = self._compute_feature_similarity(features, other_entry.features)
            if similarity > 0.5:  # Only include reasonably similar
                similar[other_id] = similarity

        return similar

    def _compute_feature_similarity(self, features1: Dict, features2: Dict) -> float:
        """Compute similarity between feature sets"""
        # Get common features
        common_features = set(features1.keys()) & set(features2.keys())

        if not common_features:
            return 0.0

        # Compute cosine similarity
        values1 = np.array([features1[f] for f in common_features])
        values2 = np.array([features2[f] for f in common_features])

        dot_product = np.dot(values1, values2)
        norm1 = np.linalg.norm(values1)
        norm2 = np.linalg.norm(values2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)
        return float(similarity)

    def search(self,
              query: str,
              search_fields: Optional[List[str]] = None,
              tags: Optional[List[str]] = None,
              category: Optional[str] = None,
              min_novelty: float = 0.0) -> List[PhenomenonEntry]:
        """
        Search catalog

        Args:
            query: Search query string
            search_fields: Fields to search in
            tags: Filter by tags
            category: Filter by category
            min_novelty: Minimum novelty score

        Returns:
            List of matching entries
        """
        if search_fields is None:
            search_fields = ["name", "short_name", "description"]

        results = []

        for entry in self.entries.values():
            # Check novelty threshold
            if entry.novelty_score < min_novelty:
                continue

            # Check category
            if category and entry.category != category:
                continue

            # Check tags
            if tags:
                if not any(tag in entry.tags for tag in tags):
                    continue

            # Check text query
            if query:
                query_lower = query.lower()
                matches = False

                for field in search_fields:
                    field_value = getattr(entry, field, "")
                    if query_lower in str(field_value).lower():
                        matches = True
                        break

                if not matches:
                    continue

            results.append(entry)

        # Sort by relevance (novelty + query match)
        results.sort(key=lambda e: e.novelty_score, reverse=True)

        return results

    def find_by_signature(self,
                         target_signature: Dict[str, Any],
                         threshold: float = 0.7) -> List[SignatureMatch]:
        """
        Find phenomena with similar computational signatures

        Args:
            target_signature: Signature to match
            threshold: Minimum similarity threshold

        Returns:
            List of signature matches
        """
        matches = []

        for entry in self.entries.values():
            similarity = self._compute_signature_similarity(
                target_signature,
                entry.computational_signature
            )

            if similarity >= threshold:
                # Analyze matching/non-matching features
                target_keys = set(target_signature.keys())
                entry_keys = set(entry.computational_signature.keys())

                matching_features = list(target_keys & entry_keys)
                non_matching_features = list(target_keys ^ entry_keys)

                match = SignatureMatch(
                    phenomenon_id=entry.entry_id,
                    phenomenon_name=entry.name,
                    similarity_score=similarity,
                    matching_features=matching_features,
                    non_matching_features=non_matching_features,
                    notes=f"Found {len(matching_features)} matching features"
                )

                matches.append(match)

        # Sort by similarity
        matches.sort(key=lambda m: m.similarity_score, reverse=True)

        return matches

    def _compute_signature_similarity(self,
                                    sig1: Dict[str, Any],
                                    sig2: Dict[str, Any]) -> float:
        """Compute similarity between computational signatures"""
        # Get common keys
        common_keys = set(sig1.keys()) & set(sig2.keys())

        if not common_keys:
            return 0.0

        # For numeric values, compute correlation
        numeric_values1 = []
        numeric_values2 = []

        for key in common_keys:
            val1 = sig1[key]
            val2 = sig2[key]

            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                numeric_values1.append(val1)
                numeric_values2.append(val2)

        if numeric_values1:
            # Compute correlation
            correlation = np.corrcoef(numeric_values1, numeric_values2)[0, 1]
            if not np.isnan(correlation):
                return float(abs(correlation))

        # Fallback: Jaccard similarity of keys
        all_keys = set(sig1.keys()) | set(sig2.keys())
        jaccard = len(common_keys) / len(all_keys)

        return jaccard

    def compare_phenomena(self,
                         phenomenon_id1: str,
                         phenomenon_id2: str) -> Dict[str, Any]:
        """
        Compare two phenomena in detail

        Args:
            phenomenon_id1: First phenomenon
            phenomenon_id2: Second phenomenon

        Returns:
            Detailed comparison
        """
        if phenomenon_id1 not in self.entries or phenomenon_id2 not in self.entries:
            return {"error": "One or both phenomena not found"}

        p1 = self.entries[phenomenon_id1]
        p2 = self.entries[phenomenon_id2]

        comparison = {
            "phenomenon1": {
                "id": p1.entry_id,
                "name": p1.name,
                "category": p1.category
            },
            "phenomenon2": {
                "id": p2.entry_id,
                "name": p2.name,
                "category": p2.category
            },
            "feature_similarity": self._compute_feature_similarity(p1.features, p2.features),
            "signature_similarity": self._compute_signature_similarity(
                p1.computational_signature,
                p2.computational_signature
            ),
            "shared_tags": list(set(p1.tags) & set(p2.tags)),
            "unique_tags_p1": list(set(p1.tags) - set(p2.tags)),
            "unique_tags_p2": list(set(p2.tags) - set(p1.tags)),
            "category_same": p1.category == p2.category,
            "novelty_comparison": {
                "p1": p1.novelty_score,
                "p2": p2.novelty_score,
                "more_novel": "p1" if p1.novelty_score > p2.novelty_score else "p2"
            }
        }

        return comparison

    def get_publication_ready(self) -> List[PhenomenonEntry]:
        """Get all publication-ready phenomena"""
        return [e for e in self.entries.values() if e.publication_ready]

    def mark_publication_ready(self,
                             phenomenon_id: str,
                             notes: str = "") -> bool:
        """Mark phenomenon as publication-ready"""
        if phenomenon_id not in self.entries:
            return False

        entry = self.entries[phenomenon_id]
        entry.publication_ready = True
        entry.publication_notes = notes

        print(f"📄 Marked {entry.short_name} as publication-ready")

        self._save_catalog()
        return True

    def export_for_publication(self,
                              phenomenon_ids: List[str],
                              format: str = "latex") -> str:
        """
        Export phenomena for publication

        Args:
            phenomenon_ids: Phenomena to export
            format: Export format (latex, markdown, json)

        Returns:
            Exported content
        """
        entries = [self.entries[eid] for eid in phenomenon_ids if eid in self.entries]

        if format == "latex":
            return self._export_latex(entries)
        elif format == "markdown":
            return self._export_markdown(entries)
        elif format == "json":
            return self._export_json(entries)
        else:
            raise ValueError(f"Unknown format: {format}")

    def _export_latex(self, entries: List[PhenomenonEntry]) -> str:
        """Export as LaTeX"""
        latex_parts = []

        for entry in entries:
            latex_parts.append(f"""
\\section*{{{entry.name}}}

\\textbf{{Short Name:}} {entry.short_name} \\\\
\\textbf{{Category:}} {entry.category} \\\\
\\textbf{{Discovery Date:}} {entry.discovery_date}

\\subsection*{Description}
{entry.description}

\\subsection*{Characterization}
\\textbf{Features:}
\\begin{{itemize}}
""")
            for feature, value in entry.features.items():
                latex_parts.append(f"    \\item {feature}: {value:.4f}")

            latex_parts.append("\\end{itemize}")

            if entry.hypothesized_mechanism:
                latex_parts.append(f"""
\\subsection*{Mechanism}
{entry.hypothesized_mechanism}

\\textit{{Confidence:}} {entry.confidence_in_mechanism:.2f}
""")

            if entry.mathematical_model:
                latex_parts.append(f"""
\\subsection*{{Mathematical Model}}
{entry.mathematical_model}
""")

            latex_parts.append("\\vspace{1cm}\n")

        return "\n".join(latex_parts)

    def _export_markdown(self, entries: List[PhenomenonEntry]) -> str:
        """Export as Markdown"""
        md_parts = []

        for entry in entries:
            md_parts.append(f"""# {entry.name}

**Short Name:** {entry.short_name}
**Category:** {entry.category}
**Discovery Date:** {entry.discovery_date}

## Description
{entry.description}

## Characterization

**Features:**
""")
            for feature, value in entry.features.items():
                md_parts.append(f"- {feature}: {value:.4f}")

            if entry.hypothesized_mechanism:
                md_parts.append(f"""
## Mechanism
{entry.hypothesized_mechanism}

*Confidence:* {entry.confidence_in_mechanism:.2f}
""")

            if entry.mathematical_model:
                md_parts.append(f"""
## Mathematical Model
{entry.mathematical_model}
""")

            md_parts.append("\n---\n")

        return "\n".join(md_parts)

    def _export_json(self, entries: List[PhenomenonEntry]) -> str:
        """Export as JSON"""
        data = []

        for entry in entries:
            entry_dict = {
                "entry_id": entry.entry_id,
                "name": entry.name,
                "short_name": entry.short_name,
                "description": entry.description,
                "category": entry.category,
                "tags": entry.tags,
                "features": entry.features,
                "computational_signature": entry.computational_signature,
                "hypothesized_mechanism": entry.hypothesized_mechanism,
                "confidence_in_mechanism": entry.confidence_in_mechanism,
                "mathematical_model": entry.mathematical_model,
                "critical_exponents": entry.critical_exponents,
                "scaling_laws": entry.scaling_laws,
                "novelty_score": entry.novelty_score,
                "theoretical_importance": entry.theoretical_importance,
                "practical_applications": entry.practical_applications
            }

            data.append(entry_dict)

        return json.dumps(data, indent=2, default=str)

    def _save_catalog(self) -> None:
        """Save catalog to disk"""
        # Save entries
        entries_file = self.catalog_path / "entries.json"

        entries_data = {}
        for entry_id, entry in self.entries.items():
            entries_data[entry_id] = {
                "entry_id": entry.entry_id,
                "name": entry.name,
                "short_name": entry.short_name,
                "description": entry.description,
                "discovery_date": entry.discovery_date,
                "discoverer": entry.discoverer,
                "category": entry.category,
                "tags": entry.tags,
                "features": entry.features,
                "computational_signature": entry.computational_signature,
                "phase_space_location": entry.phase_space_location,
                "hypothesized_mechanism": entry.hypothesized_mechanism,
                "confidence_in_mechanism": entry.confidence_in_mechanism,
                "alternative_mechanisms": entry.alternative_mechanisms,
                "mathematical_model": entry.mathematical_model,
                "critical_exponents": entry.critical_exponents,
                "scaling_laws": entry.scaling_laws,
                "supporting_experiments": entry.supporting_experiments,
                "replication_status": entry.replication_status,
                "robustness_score": entry.robustness_score,
                "novelty_score": entry.novelty_score,
                "similarity_to_known": entry.similarity_to_known,
                "uniqueness_claims": entry.uniqueness_claims,
                "theoretical_importance": entry.theoretical_importance,
                "practical_applications": entry.practical_applications,
                "related_theories": entry.related_theories,
                "publication_ready": entry.publication_ready,
                "publication_notes": entry.publication_notes,
                "metadata": entry.metadata
            }

        with open(entries_file, 'w') as f:
            json.dump(entries_data, f, indent=2, default=str)

        # Save indices
        indices_file = self.catalog_path / "indices.json"

        indices_data = {
            "tag_index": {tag: list(ids) for tag, ids in self.tag_index.items()},
            "category_index": {cat: list(ids) for cat, ids in self.category_index.items()}
        }

        with open(indices_file, 'w') as f:
            json.dump(indices_data, f, indent=2)

    def _load_catalog(self) -> None:
        """Load catalog from disk"""
        entries_file = self.catalog_path / "entries.json"

        if not entries_file.exists():
            return

        with open(entries_file, 'r') as f:
            entries_data = json.load(f)

        for entry_id, data in entries_data.items():
            entry = PhenomenonEntry(**data)
            self.entries[entry_id] = entry

        # Load indices
        indices_file = self.catalog_path / "indices.json"

        if indices_file.exists():
            with open(indices_file, 'r') as f:
                indices_data = json.load(f)

            self.tag_index = {tag: set(ids) for tag, ids in indices_data.get("tag_index", {}).items()}
            self.category_index = {cat: set(ids) for cat, ids in indices_data.get("category_index", {}).items()}

    def generate_catalog_report(self) -> str:
        """Generate catalog report"""
        report = []
        report.append("=" * 80)
        report.append("PHENOMENON CATALOG REPORT")
        report.append("=" * 80)
        report.append("")

        # Statistics
        report.append("STATISTICS")
        report.append("-" * 80)
        report.append(f"Total phenomena: {len(self.entries)}")
        report.append(f"Publication ready: {len(self.get_publication_ready())}")
        report.append(f"Categories: {len(self.category_index)}")
        report.append(f"Tags: {len(self.tag_index)}")
        report.append("")

        # Phenomena by category
        report.append("PHENOMENA BY CATEGORY")
        report.append("-" * 80)

        category_counts = {}
        for entry in self.entries.values():
            category_counts[entry.category] = category_counts.get(entry.category, 0) + 1

        for category, count in sorted(category_counts.items()):
            report.append(f"{category}: {count}")

        report.append("")

        # Most novel phenomena
        report.append("MOST NOVEL PHENOMENA")
        report.append("-" * 80)

        novel_sorted = sorted(self.entries.values(), key=lambda e: e.novelty_score, reverse=True)

        for i, entry in enumerate(novel_sorted[:10]):
            report.append(f"{i+1}. {entry.short_name}")
            report.append(f"   Novelty: {entry.novelty_score:.3f}")
            report.append(f"   Category: {entry.category}")

        report.append("")

        # Publication ready
        report.append("PUBLICATION-READY PHENOMENA")
        report.append("-" * 80)

        pub_ready = self.get_publication_ready()
        if pub_ready:
            for entry in pub_ready:
                report.append(f"- {entry.short_name}: {entry.name}")
        else:
            report.append("(None)")

        report.append("")

        return "\n".join(report)


if __name__ == "__main__":
    # Test catalog
    print("Testing Phenomenon Catalog")

    catalog = PhenomenonCatalog(catalog_path="./test_phenomenon_catalog")

    # Create test entry
    discovery_data = {
        "description": "Sudden emergence of coordination when agent density exceeds threshold",
        "features": {
            "coordination": 0.95,
            "criticality": 0.92,
            "phase_transition": 0.88
        },
        "signature": {
            "type": "first_order",
            "threshold": 0.73,
            "hysteresis": False
        },
        "mechanism": "Percolation of information pathways",
        "mechanism_confidence": 0.7,
        "theoretical_importance": 0.8
    }

    entry = catalog.create_entry_from_discovery(
        discovery_data,
        name="Density-Induced Coordination Transition",
        short_name="Coordination Transition",
        category="phase_transition"
    )

    print(f"\nCreated entry: {entry.entry_id}")
    print(f"Novelty score: {entry.novelty_score:.3f}")

    # Search
    results = catalog.search("coordination", min_novelty=0.0)
    print(f"\nSearch results: {len(results)}")

    # Generate report
    report = catalog.generate_catalog_report()
    print("\n" + report)
