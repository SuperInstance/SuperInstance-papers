"""
Collaborative Results Portal
=============================

Portal for sharing and disseminating collaborative research results
including papers, datasets, code, and presentations.

Features:
- Publication sharing
- Results indexing and search
- Collaborative annotation
- Impact tracking
- Cross-publication linking
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime
from enum import Enum
import json
from pathlib import Path


class ResultType(Enum):
    """Types of research results"""
    PUBLICATION = "publication"
    PREPRINT = "preprint"
    DATASET = "dataset"
    SOFTWARE = "software"
    PRESENTATION = "presentation"
    TECH_REPORT = "tech_report"
    TUTORIAL = "tutorial"
    BLOG_POST = "blog_post"


class PublicationVenue(Enum):
    """Publication venue types"""
    JOURNAL = "journal"
    CONFERENCE = "conference"
    WORKSHOP = "workshop"
    ARXIV = "arxiv"
    BIORXIV = "biorxiv"
    INDUSTRY_REPORT = "industry_report"


@dataclass
class ResearchResult:
    """Collaborative research result"""
    result_id: str
    title: str
    description: str
    result_type: ResultType

    # Authors
    author_ids: List[str] = field(default_factory=list)
    author_names: List[str] = field(default_factory=list)
    author_institutions: List[str] = field(default_factory=list)

    # Content
    abstract: str = ""
    keywords: List[str] = field(default_factory=list)
    full_text_url: str = ""
    pdf_url: str = ""
    supplementary_materials: List[str] = field(default_factory=list)

    # Publication details (if applicable)
    venue: Optional[PublicationVenue] = None
    venue_name: str = ""  # e.g., "Nature", "ICML"
    volume: str = ""
    issue: str = ""
    pages: str = ""
    publication_date: Optional[datetime] = None
    doi: str = ""
    citations: int = 0

    # Projects
    originating_projects: List[str] = field(default_factory=list)
    related_papers: List[str] = field(default_factory=list)  # SuperInstance paper IDs

    # Status
    is_published: bool = False
    is_peer_reviewed: bool = False
    open_access: bool = True

    # Metrics
    view_count: int = 0
    download_count: int = 0
    citation_count: int = 0
    altmetric_score: float = 0.0

    # Annotations
    user_annotations: List[Dict] = field(default_factory=list)
    community_ratings: List[Dict] = field(default_factory=list)

    # Timestamps
    submitted: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class ResultComment:
    """Comment or annotation on research result"""
    comment_id: str
    result_id: str
    commenter_id: str
    commenter_name: str
    commenter_institution: str

    # Content
    text: str
    section_reference: Optional[str] = None  # e.g., "Section 3.2"
    quote: str = ""

    # Type
    comment_type: str = "general"  # "general", "question", "correction", "extension"

    # Thread
    parent_comment_id: Optional[str] = None
    replies: List[str] = field(default_factory=list)

    # Status
    resolved: bool = False
    resolved_by: Optional[str] = None

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


class ResultsPortal:
    """
    Portal for sharing and discovering collaborative research results.

    Features:
    - Result submission and indexing
    - Search and discovery
    - Collaborative annotation
    - Impact tracking
    """

    def __init__(self, data_dir: str = "data/results_portal"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.results: Dict[str, ResearchResult] = {}
        self.comments: Dict[str, ResultComment] = {}

        self._load_data()

    def _load_data(self):
        """Load results portal data from disk"""
        results_file = self.data_dir / "results.json"
        comments_file = self.data_dir / "comments.json"

        if results_file.exists():
            with open(results_file, 'r') as f:
                data = json.load(f)
                for rdata in data:
                    # Convert datetime strings
                    for dt_field in ["submitted", "last_updated", "publication_date"]:
                        if dt_field in rdata and rdata[dt_field]:
                            rdata[dt_field] = datetime.fromisoformat(rdata[dt_field])
                    # Convert venue enum
                    if "venue" in rdata and rdata["venue"]:
                        rdata["venue"] = PublicationVenue(rdata["venue"])
                    # Convert type enum
                    if "result_type" in rdata:
                        rdata["result_type"] = ResultType(rdata["result_type"])
                    self.results[rdata["result_id"]] = ResearchResult(**rdata)

        if comments_file.exists():
            with open(comments_file, 'r') as f:
                data = json.load(f)
                for cdata in data:
                    for dt_field in ["created", "updated"]:
                        if dt_field in cdata and cdata[dt_field]:
                            cdata[dt_field] = datetime.fromisoformat(cdata[dt_field])
                    self.comments[cdata["comment_id"]] = ResultComment(**cdata)

    def _save_data(self):
        """Save results portal data to disk"""
        results_file = self.data_dir / "results.json"
        comments_file = self.data_dir / "comments.json"

        with open(results_file, 'w') as f:
            data = []
            for result in self.results.values():
                rdict = result.__dict__.copy()
                # Convert enums to strings
                if result.venue:
                    rdict["venue"] = result.venue.value
                rdict["result_type"] = result.result_type.value
                data.append(rdict)
            json.dump(data, f, indent=2, default=str)

        with open(comments_file, 'w') as f:
            json.dump(
                [c.__dict__ for c in self.comments.values()],
                f,
                indent=2,
                default=str
            )

    def submit_result(
        self,
        title: str,
        description: str,
        result_type: ResultType,
        author_ids: List[str],
        author_names: List[str],
        author_institutions: List[str],
        abstract: str = "",
        keywords: Optional[List[str]] = None,
        originating_projects: Optional[List[str]] = None,
        related_papers: Optional[List[str]] = None,
        **kwargs
    ) -> ResearchResult:
        """Submit a new research result"""
        result_id = f"result_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        result = ResearchResult(
            result_id=result_id,
            title=title,
            description=description,
            result_type=result_type,
            author_ids=author_ids,
            author_names=author_names,
            author_institutions=author_institutions,
            abstract=abstract,
            keywords=keywords or [],
            originating_projects=originating_projects or [],
            related_papers=related_papers or [],
            **kwargs
        )

        self.results[result_id] = result
        self._save_data()
        return result

    def add_comment(
        self,
        result_id: str,
        commenter_id: str,
        commenter_name: str,
        commenter_institution: str,
        text: str,
        comment_type: str = "general",
        section_reference: Optional[str] = None,
        parent_comment_id: Optional[str] = None
    ) -> ResultComment:
        """Add comment to research result"""
        if result_id not in self.results:
            raise ValueError(f"Result {result_id} not found")

        comment_id = f"comment_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        comment = ResultComment(
            comment_id=comment_id,
            result_id=result_id,
            commenter_id=commenter_id,
            commenter_name=commenter_name,
            commenter_institution=commenter_institution,
            text=text,
            comment_type=comment_type,
            section_reference=section_reference,
            parent_comment_id=parent_comment_id
        )

        self.comments[comment_id] = comment

        # Add to result annotations
        self.results[result_id].user_annotations.append({
            "comment_id": comment_id,
            "type": comment_type,
            "author": commenter_name
        })

        # Add to parent's replies if this is a reply
        if parent_comment_id and parent_comment_id in self.comments:
            self.comments[parent_comment_id].replies.append(comment_id)

        self._save_data()
        return comment

    def search_results(
        self,
        query: str = "",
        result_type: Optional[ResultType] = None,
        keywords: Optional[List[str]] = None,
        author_ids: Optional[List[str]] = None,
        related_papers: Optional[List[str]] = None,
        originating_projects: Optional[List[str]] = None,
        venue: Optional[PublicationVenue] = None,
        is_published: Optional[bool] = None,
        min_date: Optional[datetime] = None,
        max_results: int = 20
    ) -> List[ResearchResult]:
        """Search for research results"""
        results = list(self.results.values())

        # Text search (simple keyword matching in title, description, abstract)
        if query:
            query_lower = query.lower()
            results = [
                r for r in results
                if query_lower in r.title.lower()
                or query_lower in r.description.lower()
                or query_lower in r.abstract.lower()
            ]

        # Filter by type
        if result_type is not None:
            results = [r for r in results if r.result_type == result_type]

        # Filter by keywords
        if keywords:
            results = [
                r for r in results
                if any(kw.lower() in [k.lower() for k in r.keywords] for kw in keywords)
            ]

        # Filter by authors
        if author_ids:
            results = [
                r for r in results
                if any(aid in r.author_ids for aid in author_ids)
            ]

        # Filter by related papers
        if related_papers:
            results = [
                r for r in results
                if any(paper in r.related_papers for paper in related_papers)
            ]

        # Filter by projects
        if originating_projects:
            results = [
                r for r in results
                if any(proj in r.originating_projects for proj in originating_projects)
            ]

        # Filter by venue
        if venue is not None:
            results = [r for r in results if r.venue == venue]

        # Filter by publication status
        if is_published is not None:
            results = [r for r in results if r.is_published == is_published]

        # Filter by date
        if min_date is not None:
            results = [r for r in results if r.submitted >= min_date]

        # Sort by submission date (newest first)
        results.sort(key=lambda r: r.submitted, reverse=True)

        return results[:max_results]

    def get_result_comments(
        self,
        result_id: str,
        include_replies: bool = True
    ) -> List[ResultComment]:
        """Get all comments for a result"""
        comments = [
            c for c in self.comments.values()
            if c.result_id == result_id and c.parent_comment_id is None
        ]

        if include_replies:
            # This is simplified - proper implementation would build full thread tree
            all_comments = [
                c for c in self.comments.values()
                if c.result_id == result_id
            ]
            return all_comments

        return comments

    def record_view(self, result_id: str):
        """Record a view of research result"""
        if result_id in self.results:
            self.results[result_id].view_count += 1
            self._save_data()

    def record_download(self, result_id: str):
        """Record a download of research result"""
        if result_id in self.results:
            self.results[result_id].download_count += 1
            self._save_data()

    def record_citation(self, result_id: str):
        """Record a citation of research result"""
        if result_id in self.results:
            self.results[result_id].citation_count += 1
            self._save_data()

    def get_trending_results(
        self,
        days: int = 30,
        max_results: int = 10
    ) -> List[ResearchResult]:
        """Get trending results based on recent activity"""
        cutoff_date = datetime.now() - timedelta(days=days)

        # Calculate trending score
        trending = []
        for result in self.results.values():
            if result.submitted < cutoff_date:
                continue

            # Trending score = views + downloads*2 + citations*10 + comments*5
            comment_count = len([
                c for c in self.comments.values()
                if c.result_id == result.result_id
            ])

            score = (
                result.view_count +
                result.download_count * 2 +
                result.citation_count * 10 +
                comment_count * 5
            )

            trending.append((result, score))

        # Sort by score
        trending.sort(key=lambda x: x[1], reverse=True)

        return [r for r, s in trending[:max_results]]

    def get_author_summary(
        self,
        author_id: str
    ) -> Dict:
        """Get summary of author's contributions"""
        author_results = [
            r for r in self.results.values()
            if author_id in r.author_ids
        ]

        total_views = sum(r.view_count for r in author_results)
        total_downloads = sum(r.download_count for r in author_results)
        total_citations = sum(r.citation_count for r in author_results)

        publications = [r for r in author_results if r.is_published]
        preprints = [r for r in author_results if not r.is_published]

        return {
            "author_id": author_id,
            "total_results": len(author_results),
            "publications": len(publications),
            "preprints": len(preprints),
            "total_views": total_views,
            "total_downloads": total_downloads,
            "total_citations": total_citations,
            "results": [
                {
                    "title": r.title,
                    "type": r.result_type.value,
                    "date": r.submitted.isoformat(),
                    "citations": r.citation_count
                }
                for r in sorted(author_results, key=lambda x: x.submitted, reverse=True)
            ]
        }

    def get_paper_summary(
        self,
        paper_id: str
    ) -> Dict:
        """Get summary of results related to a SuperInstance paper"""
        related_results = [
            r for r in self.results.values()
            if paper_id in r.related_papers
        ]

        total_views = sum(r.view_count for r in related_results)
        total_downloads = sum(r.download_count for r in related_results)
        total_citations = sum(r.citation_count for r in related_results)

        # Count unique authors
        all_authors = set()
        for result in related_results:
            all_authors.update(result.author_ids)

        return {
            "paper_id": paper_id,
            "related_results": len(related_results),
            "unique_authors": len(all_authors),
            "total_views": total_views,
            "total_downloads": total_downloads,
            "total_citations": total_citations,
            "results": [
                {
                    "result_id": r.result_id,
                    "title": r.title,
                    "type": r.result_type.value,
                    "authors": r.author_names,
                    "date": r.submitted.isoformat()
                }
                for r in sorted(related_results, key=lambda x: x.submitted, reverse=True)
            ]
        }


def main():
    """Example usage"""
    from datetime import timedelta

    portal = ResultsPortal()

    # Submit a result
    result = portal.submit_result(
        title="Energy-Efficient Consensus for Edge Computing",
        description="Novel consensus algorithms that minimize energy consumption in edge networks",
        result_type=ResultType.PUBLICATION,
        author_ids=["alice", "bob"],
        author_names=["Dr. Alice Chen", "Dr. Bob Mueller"],
        author_institutions=["MIT", "TUM"],
        abstract="This paper presents energy-efficient consensus algorithms...",
        keywords=["consensus", "edge computing", "energy efficiency"],
        originating_projects=["proj_001"],
        related_papers=["P12", "P13"],
        venue=PublicationVenue.CONFERENCE,
        venue_name="ACM PODC",
        publication_date=datetime.now(),
        is_published=True
    )

    print(f"Submitted result: {result.title}")
    print(f"Result ID: {result.result_id}")

    # Add comment
    comment = portal.add_comment(
        result_id=result.result_id,
        commenter_id="carol",
        commenter_name="Dr. Carol Williams",
        commenter_institution="Stanford",
        text="Great work! Have you considered using renewable energy sources?",
        comment_type="question",
        section_reference="Section 5"
    )

    print(f"\nAdded comment: {comment.comment_id}")

    # Search results
    results = portal.search_results(
        query="consensus",
        related_papers=["P12"],
        is_published=True
    )

    print(f"\nFound {len(results)} results")

    # Get trending
    trending = portal.get_trending_results(days=30)
    print(f"\nTrending results: {len(trending)}")

    # Record views
    portal.record_view(result.result_id)
    portal.record_download(result.result_id)

    # Get author summary
    summary = portal.get_author_summary("alice")
    print(f"\nAuthor summary: {summary['total_results']} results")

    # Get paper summary
    paper_summary = portal.get_paper_summary("P12")
    print(f"\nPaper P12 summary: {paper_summary['related_results']} related results")


if __name__ == "__main__":
    main()
