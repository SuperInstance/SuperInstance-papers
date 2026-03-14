"""
SuperInstance Enterprise Support Portal
========================================

Enterprise-grade support ticketing and customer success system.

Features:
- Multi-tier support routing (Community, Strategic, Enterprise)
- Priority-based ticket queuing
- SLA tracking and escalation
- Knowledge base integration
- Customer success metrics
- Support analytics and reporting

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
import uuid
import json
import logging
from pathlib import Path
import asyncio
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ============================================================================
# Support Tiers and Priorities
# ============================================================================

class SupportTier(str, Enum):
    """Support partnership tiers"""
    COMMUNITY = "community"
    STRATEGIC = "strategic"
    ENTERPRISE = "enterprise"


class TicketPriority(str, Enum):
    """Ticket priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TicketStatus(str, Enum):
    """Ticket status values"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class TicketCategory(str, Enum):
    """Ticket categories"""
    TECHNICAL = "technical"
    BILLING = "billing"
    FEATURE_REQUEST = "feature_request"
    BUG_REPORT = "bug_report"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    PERFORMANCE = "performance"
    INTEGRATION = "integration"
    DOCUMENTATION = "documentation"
    OTHER = "other"


# ============================================================================
# SLA Definitions
# ============================================================================

class SLA:
    """Service Level Agreement definitions by tier and priority"""

    # Response times (time to first response)
    RESPONSE_TIMES = {
        SupportTier.COMMUNITY: {
            TicketPriority.CRITICAL: None,  # No guarantee
            TicketPriority.HIGH: None,
            TicketPriority.MEDIUM: None,
            TicketPriority.LOW: None
        },
        SupportTier.STRATEGIC: {
            TicketPriority.CRITICAL: timedelta(hours=4),
            TicketPriority.HIGH: timedelta(hours=8),
            TicketPriority.MEDIUM: timedelta(hours=24),
            TicketPriority.LOW: timedelta(days=2)
        },
        SupportTier.ENTERPRISE: {
            TicketPriority.CRITICAL: timedelta(hours=1),
            TicketPriority.HIGH: timedelta(hours=4),
            TicketPriority.MEDIUM: timedelta(hours=12),
            TicketPriority.LOW: timedelta(hours=24)
        }
    }

    # Resolution times (time to resolution)
    RESOLUTION_TIMES = {
        SupportTier.COMMUNITY: {
            TicketPriority.CRITICAL: None,
            TicketPriority.HIGH: None,
            TicketPriority.MEDIUM: None,
            TicketPriority.LOW: None
        },
        SupportTier.STRATEGIC: {
            TicketPriority.CRITICAL: timedelta(days=1),
            TicketPriority.HIGH: timedelta(days=3),
            TicketPriority.MEDIUM: timedelta(days=7),
            TicketPriority.LOW: timedelta(days=14)
        },
        SupportTier.ENTERPRISE: {
            TicketPriority.CRITICAL: timedelta(hours=8),
            TicketPriority.HIGH: timedelta(days=1),
            TicketPriority.MEDIUM: timedelta(days=3),
            TicketPriority.LOW: timedelta(days=7)
        }
    }

    @classmethod
    def get_response_time(cls, tier: SupportTier, priority: TicketPriority) -> Optional[timedelta]:
        """Get SLA response time for tier and priority"""
        return cls.RESPONSE_TIMES.get(tier, {}).get(priority)

    @classmethod
    def get_resolution_time(cls, tier: SupportTier, priority: TicketPriority) -> Optional[timedelta]:
        """Get SLA resolution time for tier and priority"""
        return cls.RESOLUTION_TIMES.get(tier, {}).get(priority)


# ============================================================================
# Ticket Model
# ============================================================================

@dataclass
class SupportTicket:
    """Support ticket"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    category: TicketCategory = TicketCategory.TECHNICAL
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    tier: SupportTier = SupportTier.COMMUNITY

    # Customer information
    customer_id: str = ""
    customer_name: str = ""
    customer_email: str = ""
    organization: str = ""

    # Assignment
    assigned_to: Optional[str] = None  # Support agent ID
    team: Optional[str] = None  # Support team

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # SLA tracking
    sla_response_due: Optional[datetime] = None
    sla_resolution_due: Optional[datetime] = None
    sla_response_met: Optional[bool] = None
    sla_resolution_met: Optional[bool] = None

    # Attachments and links
    attachments: List[str] = field(default_factory=list)
    related_tickets: List[str] = field(default_factory=list)
    external_references: List[str] = field(default_factory=list)  # GitHub issues, etc.

    # Technical details
    environment: Optional[str] = None  # production, staging, development
    version: Optional[str] = None
    error_logs: Optional[str] = None
    reproduction_steps: Optional[str] = None

    # Resolution
    resolution: Optional[str] = None
    resolution_public: bool = True  # Can resolution be shared publicly?

    # Metrics
    customer_satisfaction: Optional[int] = None  # 1-5 rating
    time_to_first_response: Optional[timedelta] = None
    time_to_resolution: Optional[timedelta] = None
    total_time: Optional[timedelta] = None

    # Internal notes
    internal_notes: List[str] = field(default_factory=list)

    def calculate_sla_deadlines(self):
        """Calculate SLA deadlines based on tier and priority"""
        response_time = SLA.get_response_time(self.tier, self.priority)
        resolution_time = SLA.get_resolution_time(self.tier, self.priority)

        if response_time:
            self.sla_response_due = self.created_at + response_time

        if resolution_time:
            self.sla_resolution_due = self.created_at + resolution_time

    def check_sla_compliance(self) -> Dict[str, Any]:
        """Check SLA compliance"""
        now = datetime.utcnow()
        compliance = {}

        # Check response SLA
        if self.sla_response_due:
            if self.first_response_at:
                self.sla_response_met = self.first_response_at <= self.sla_response_due
            else:
                compliance['response_overdue'] = now > self.sla_response_due

        # Check resolution SLA
        if self.sla_resolution_due:
            if self.resolved_at:
                self.sla_resolution_met = self.resolved_at <= self.sla_resolution_due
            else:
                compliance['resolution_overdue'] = now > self.sla_resolution_due

        return compliance

    def escalate(self) -> bool:
        """Escalate ticket"""
        if self.status != TicketStatus.ESCALATED:
            self.status = TicketStatus.ESCALATED
            self.priority = TicketPriority.HIGH if self.priority != TicketPriority.CRITICAL else TicketPriority.CRITICAL
            return True
        return False


# ============================================================================
# Comment Model
# ============================================================================

@dataclass
class TicketComment:
    """Comment on support ticket"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str = ""
    author_id: str = ""
    author_name: str = ""
    is_internal: bool = False  # True = internal note, False = visible to customer
    content: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    attachments: List[str] = field(default_factory=list)


# ============================================================================
# Support Agent Model
# ============================================================================

@dataclass
class SupportAgent:
    """Support agent"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    email: str = ""
    role: str = ""  # agent, senior_agent, lead, manager
    team: str = ""
    specializations: List[str] = field(default_factory=list)  # Categories agent handles
    tier_access: List[SupportTier] = field(default_factory=list)
    is_active: bool = True
    capacity: int = 10  # Max concurrent tickets
    current_tickets: int = 0

    # Metrics
    tickets_resolved: int = 0
    avg_resolution_time: Optional[float] = None  # Hours
    customer_satisfaction_avg: Optional[float] = None

    def can_handle_ticket(self, ticket: SupportTicket) -> bool:
        """Check if agent can handle ticket"""
        if not self.is_active:
            return False

        if ticket.tier not in self.tier_access:
            return False

        if ticket.category.value not in self.specializations:
            return False

        if self.current_tickets >= self.capacity:
            return False

        return True


# ============================================================================
# Support Portal
# ============================================================================

class SupportPortal:
    """Enterprise support portal"""

    def __init__(self):
        self.tickets: Dict[str, SupportTicket] = {}
        self.comments: Dict[str, List[TicketComment]] = {}
        self.agents: Dict[str, SupportAgent] = {}
        self.knowledge_base: Dict[str, str] = {}
        self.escalation_rules: List[Dict[str, Any]] = []

    def create_ticket(self,
                     customer_id: str,
                     customer_name: str,
                     customer_email: str,
                     organization: str,
                     tier: SupportTier,
                     title: str,
                     description: str,
                     category: TicketCategory,
                     priority: TicketPriority = TicketPriority.MEDIUM,
                     **kwargs) -> SupportTicket:
        """Create new support ticket"""
        ticket = SupportTicket(
            title=title,
            description=description,
            category=category,
            priority=priority,
            tier=tier,
            customer_id=customer_id,
            customer_name=customer_name,
            customer_email=customer_email,
            organization=organization,
            **kwargs
        )

        ticket.calculate_sla_deadlines()
        self.tickets[ticket.id] = ticket
        self.comments[ticket.id] = []

        # Auto-assign if possible
        self._auto_assign_ticket(ticket)

        # Log ticket creation
        logger.info(f"Ticket {ticket.id} created by {customer_email} (Priority: {priority.value})")

        return ticket

    def _auto_assign_ticket(self, ticket: SupportTicket):
        """Auto-assign ticket to available agent"""
        # Skip auto-assignment for community tier
        if ticket.tier == SupportTier.COMMUNITY:
            return

        # Find available agent
        for agent in self.agents.values():
            if agent.can_handle_ticket(ticket):
                self.assign_ticket(ticket.id, agent.id)
                break

    def assign_ticket(self, ticket_id: str, agent_id: str) -> bool:
        """Assign ticket to agent"""
        ticket = self.tickets.get(ticket_id)
        agent = self.agents.get(agent_id)

        if not ticket or not agent:
            return False

        if not agent.can_handle_ticket(ticket):
            return False

        ticket.assigned_to = agent_id
        ticket.team = agent.team
        agent.current_tickets += 1

        logger.info(f"Ticket {ticket_id} assigned to {agent.name}")
        return True

    def add_comment(self,
                   ticket_id: str,
                   author_id: str,
                   author_name: str,
                   content: str,
                   is_internal: bool = False) -> TicketComment:
        """Add comment to ticket"""
        if ticket_id not in self.tickets:
            raise ValueError(f"Ticket {ticket_id} not found")

        comment = TicketComment(
            ticket_id=ticket_id,
            author_id=author_id,
            author_name=author_name,
            is_internal=is_internal,
            content=content
        )

        self.comments[ticket_id].append(comment)

        # Update ticket timestamp
        self.tickets[ticket_id].updated_at = datetime.utcnow()

        # Track first response
        if not is_internal and not self.tickets[ticket_id].first_response_at:
            self.tickets[ticket_id].first_response_at = comment.created_at
            self.tickets[ticket_id].time_to_first_response = \
                comment.created_at - self.tickets[ticket_id].created_at

        return comment

    def update_ticket_status(self, ticket_id: str, status: TicketStatus, resolution: Optional[str] = None):
        """Update ticket status"""
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        ticket.status = status
        ticket.updated_at = datetime.utcnow()

        if status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.utcnow()
            ticket.resolution = resolution
            ticket.time_to_resolution = ticket.resolved_at - ticket.created_at

            # Update agent metrics
            if ticket.assigned_to:
                agent = self.agents.get(ticket.assigned_to)
                if agent:
                    agent.tickets_resolved += 1
                    agent.current_tickets -= 1

        elif status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.utcnow()
            ticket.total_time = ticket.closed_at - ticket.created_at

            # Final SLA compliance check
            ticket.check_sla_compliance()

    def get_ticket(self, ticket_id: str) -> Optional[SupportTicket]:
        """Get ticket by ID"""
        return self.tickets.get(ticket_id)

    def get_tickets_by_customer(self, customer_id: str) -> List[SupportTicket]:
        """Get all tickets for customer"""
        return [t for t in self.tickets.values() if t.customer_id == customer_id]

    def get_tickets_by_status(self, status: TicketStatus) -> List[SupportTicket]:
        """Get all tickets with status"""
        return [t for t in self.tickets.values() if t.status == status]

    def get_overdue_tickets(self) -> List[SupportTicket]:
        """Get tickets past SLA deadlines"""
        now = datetime.utcnow()
        overdue = []

        for ticket in self.tickets.values():
            if ticket.sla_response_due and not ticket.first_response_at:
                if now > ticket.sla_response_due:
                    overdue.append(ticket)
            elif ticket.sla_resolution_due and not ticket.resolved_at:
                if now > ticket.sla_resolution_due:
                    overdue.append(ticket)

        return overdue

    def search_tickets(self,
                      query: str,
                      category: Optional[TicketCategory] = None,
                      priority: Optional[TicketPriority] = None,
                      status: Optional[TicketStatus] = None,
                      tier: Optional[SupportTier] = None) -> List[SupportTicket]:
        """Search tickets"""
        results = []

        for ticket in self.tickets.values():
            # Text search
            if query and query.lower() not in ticket.title.lower() and query.lower() not in ticket.description.lower():
                continue

            # Filter by category
            if category and ticket.category != category:
                continue

            # Filter by priority
            if priority and ticket.priority != priority:
                continue

            # Filter by status
            if status and ticket.status != status:
                continue

            # Filter by tier
            if tier and ticket.tier != tier:
                continue

            results.append(ticket)

        return results

    def rate_satisfaction(self, ticket_id: str, rating: int):
        """Rate customer satisfaction (1-5)"""
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        if not 1 <= rating <= 5:
            raise ValueError("Rating must be between 1 and 5")

        ticket.customer_satisfaction = rating

        # Update agent metrics
        if ticket.assigned_to:
            agent = self.agents.get(ticket.assigned_to)
            if agent:
                # Recalculate average satisfaction
                agent_tickets = [t for t in self.tickets.values()
                                if t.assigned_to == agent.id and t.customer_satisfaction]
                agent.customer_satisfaction_avg = sum(t.customer_satisfaction for t in agent_tickets) / len(agent_tickets)

    def get_dashboard_metrics(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Get support dashboard metrics"""
        if agent_id:
            # Agent-specific metrics
            agent = self.agents.get(agent_id)
            if not agent:
                raise ValueError(f"Agent {agent_id} not found")

            agent_tickets = [t for t in self.tickets.values() if t.assigned_to == agent_id]

            return {
                'agent_id': agent_id,
                'agent_name': agent.name,
                'current_tickets': agent.current_tickets,
                'capacity': agent.capacity,
                'utilization': agent.current_tickets / agent.capacity if agent.capacity > 0 else 0,
                'tickets_resolved': agent.tickets_resolved,
                'avg_resolution_time': agent.avg_resolution_time,
                'customer_satisfaction': agent.customer_satisfaction_avg,
                'open_tickets': len([t for t in agent_tickets if t.status == TicketStatus.OPEN]),
                'overdue_tickets': len([t for t in agent_tickets if self._is_overdue(t)])
            }
        else:
            # Global metrics
            total_tickets = len(self.tickets)
            open_tickets = len([t for t in self.tickets.values() if t.status == TicketStatus.OPEN])
            resolved_tickets = len([t for t in self.tickets.values() if t.status == TicketStatus.RESOLVED])
            overdue_tickets = len(self.get_overdue_tickets())

            # Calculate SLA compliance
            response_met = len([t for t in self.tickets.values() if t.sla_response_met is True])
            response_total = len([t for t in self.tickets.values() if t.sla_response_met is not None])

            resolution_met = len([t for t in self.tickets.values() if t.sla_resolution_met is True])
            resolution_total = len([t for t in self.tickets.values() if t.sla_resolution_met is not None])

            # Calculate average satisfaction
            rated_tickets = [t for t in self.tickets.values() if t.customer_satisfaction]
            avg_satisfaction = sum(t.customer_satisfaction for t in rated_tickets) / len(rated_tickets) if rated_tickets else None

            return {
                'total_tickets': total_tickets,
                'open_tickets': open_tickets,
                'resolved_tickets': resolved_tickets,
                'overdue_tickets': overdue_tickets,
                'sla_response_compliance': response_met / response_total if response_total > 0 else None,
                'sla_resolution_compliance': resolution_met / resolution_total if resolution_total > 0 else None,
                'avg_customer_satisfaction': avg_satisfaction,
                'tickets_by_priority': self._count_by_priority(),
                'tickets_by_category': self._count_by_category(),
                'tickets_by_tier': self._count_by_tier()
            }

    def _is_overdue(self, ticket: SupportTicket) -> bool:
        """Check if ticket is overdue"""
        now = datetime.utcnow()

        if ticket.sla_response_due and not ticket.first_response_at:
            if now > ticket.sla_response_due:
                return True

        if ticket.sla_resolution_due and not ticket.resolved_at:
            if now > ticket.sla_resolution_due:
                return True

        return False

    def _count_by_priority(self) -> Dict[str, int]:
        """Count tickets by priority"""
        counts = {p.value: 0 for p in TicketPriority}
        for ticket in self.tickets.values():
            counts[ticket.priority.value] += 1
        return counts

    def _count_by_category(self) -> Dict[str, int]:
        """Count tickets by category"""
        counts = {c.value: 0 for c in TicketCategory}
        for ticket in self.tickets.values():
            counts[ticket.category.value] += 1
        return counts

    def _count_by_tier(self) -> Dict[str, int]:
        """Count tickets by tier"""
        counts = {t.value: 0 for t in SupportTier}
        for ticket in self.tickets.values():
            counts[ticket.tier.value] += 1
        return counts


# ============================================================================
# Knowledge Base
# ============================================================================

class KnowledgeBase:
    """Support knowledge base"""

    def __init__(self):
        self.articles: Dict[str, Dict[str, Any]] = {}

    def add_article(self,
                   title: str,
                   content: str,
                   category: TicketCategory,
                   tags: List[str],
                   author_id: str) -> str:
        """Add knowledge base article"""
        article_id = str(uuid.uuid4())

        self.articles[article_id] = {
            'id': article_id,
            'title': title,
            'content': content,
            'category': category,
            'tags': tags,
            'author_id': author_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'views': 0,
            'helpful': 0,
            'not_helpful': 0
        }

        return article_id

    def search(self, query: str, category: Optional[TicketCategory] = None) -> List[Dict[str, Any]]:
        """Search knowledge base"""
        results = []
        query_lower = query.lower()

        for article in self.articles.values():
            # Text search
            if (query_lower in article['title'].lower() or
                query_lower in article['content'].lower() or
                any(query_lower in tag.lower() for tag in article['tags'])):

                # Filter by category
                if category and article['category'] != category:
                    continue

                results.append(article)

        # Sort by relevance (simple: title match > content match)
        results.sort(key=lambda a: 0 if query_lower in a['title'].lower() else 1)

        return results

    def get_related_articles(self, ticket: SupportTicket) -> List[Dict[str, Any]]:
        """Get related articles for ticket"""
        return self.search(ticket.title, ticket.category)


# ============================================================================
# Customer Success Manager
# ============================================================================

class CustomerSuccessManager:
    """Customer success metrics and tracking"""

    def __init__(self, support_portal: SupportPortal):
        self.support_portal = support_portal
        self.customer_metrics: Dict[str, Dict[str, Any]] = {}

    def track_customer_health(self, customer_id: str) -> Dict[str, Any]:
        """Calculate customer health score"""
        tickets = self.support_portal.get_tickets_by_customer(customer_id)

        if not tickets:
            return {
                'health_score': 100,
                'status': 'new',
                'total_tickets': 0,
                'open_tickets': 0,
                'avg_satisfaction': None
            }

        open_tickets = len([t for t in tickets if t.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]])
        resolved_tickets = len([t for t in tickets if t.status == TicketStatus.RESOLVED])

        # Calculate satisfaction
        rated_tickets = [t for t in tickets if t.customer_satisfaction]
        avg_satisfaction = sum(t.customer_satisfaction for t in rated_tickets) / len(rated_tickets) if rated_tickets else None

        # Calculate health score (0-100)
        health_score = 100

        # Penalty for open tickets
        health_score -= min(open_tickets * 5, 30)

        # Penalty for overdue tickets
        overdue = len([t for t in tickets if self.support_portal._is_overdue(t)])
        health_score -= min(overdue * 15, 40)

        # Bonus for high satisfaction
        if avg_satisfaction:
            health_score += (avg_satisfaction - 3) * 10

        health_score = max(0, min(100, health_score))

        # Determine status
        if health_score >= 80:
            status = 'healthy'
        elif health_score >= 60:
            status = 'at_risk'
        else:
            status = 'critical'

        return {
            'health_score': health_score,
            'status': status,
            'total_tickets': len(tickets),
            'open_tickets': open_tickets,
            'resolved_tickets': resolved_tickets,
            'avg_satisfaction': avg_satisfaction,
            'last_ticket_date': max(t.created_at for t in tickets).isoformat()
        }

    def get_churn_risk(self, customer_id: str) -> str:
        """Assess churn risk"""
        health = self.track_customer_health(customer_id)

        if health['status'] == 'critical':
            return 'high'
        elif health['status'] == 'at_risk':
            return 'medium'
        else:
            return 'low'


# ============================================================================
# Global Instances
# ============================================================================

support_portal = SupportPortal()
knowledge_base = KnowledgeBase()
customer_success = CustomerSuccessManager(support_portal)


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Create support agents
    agent1 = SupportAgent(
        name="Alice Johnson",
        email="alice@superinstance.ai",
        role="senior_agent",
        team="technical",
        specializations=['technical', 'integration', 'performance'],
        tier_access=[SupportTier.STRATEGIC, SupportTier.ENTERPRISE],
        capacity=15
    )

    agent2 = SupportAgent(
        name="Bob Smith",
        email="bob@superinstance.ai",
        role="agent",
        team="technical",
        specializations=['bug_report', 'technical'],
        tier_access=[SupportTier.STRATEGIC],
        capacity=10
    )

    support_portal.agents[agent1.id] = agent1
    support_portal.agents[agent2.id] = agent2

    # Create ticket
    ticket = support_portal.create_ticket(
        customer_id="customer-123",
        customer_name="John Doe",
        customer_email="john@company.com",
        organization="Acme Corp",
        tier=SupportTier.STRATEGIC,
        title="API latency issues",
        description="Experiencing high latency on API calls...",
        category=TicketCategory.PERFORMANCE,
        priority=TicketPriority.HIGH,
        environment="production",
        version="2.1.0"
    )

    print(f"Created ticket: {ticket.id}")
    print(f"Assigned to: {agent1.name if ticket.assigned_to == agent1.id else 'Unassigned'}")
    print(f"SLA Response Due: {ticket.sla_response_due}")

    # Add comment
    comment = support_portal.add_comment(
        ticket_id=ticket.id,
        author_id=agent1.id,
        author_name=agent1.name,
        content="We're investigating the issue. Can you provide request IDs?",
        is_internal=False
    )

    print(f"Added comment: {comment.id}")

    # Get metrics
    metrics = support_portal.get_dashboard_metrics()
    print(f"Dashboard Metrics: {json.dumps(metrics, indent=2, default=str)}")

    # Check customer health
    health = customer_success.track_customer_health("customer-123")
    print(f"Customer Health: {json.dumps(health, indent=2, default=str)}")
