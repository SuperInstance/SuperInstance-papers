"""
SuperInstance Community Platform
FastAPI-based backend for community engagement, contribution tracking, and collaboration.

This module provides the core platform functionality for managing the SuperInstance
open-source community, including discussion forums, contribution tracking, reputation
scoring, and mentorship programs.
"""

from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import jwt
import hashlib
import secrets
from functools import lru_cache
import asyncio
from dataclasses import dataclass, asdict
import json
from pathlib import Path

# Configuration
class Settings:
    """Platform configuration settings"""
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite:///community.db"
    GITHUB_WEBHOOK_SECRET: str = ""
    DISCORD_BOT_TOKEN: str = ""
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

@dataclass
class ContributorStats:
    """Contributor statistics"""
    total_commits: int = 0
    total_prs: int = 0
    total_reviews: int = 0
    total_issues: int = 0
    reputation_score: float = 0.0
    rank: str = "Newcomer"
    joined_date: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    badges: List[str] = Field(default_factory=list)

# Enums
class UserRole(str, Enum):
    """User roles in the community"""
    GUEST = "guest"
    CONTRIBUTOR = "contributor"
    MAINTAINER = "maintainer"
    TSC_MEMBER = "tsc_member"
    ADMIN = "admin"

class ContributionType(str, Enum):
    """Types of contributions"""
    CODE = "code"
    DOCUMENTATION = "documentation"
    RESEARCH = "research"
    REVIEW = "review"
    ISSUE_REPORT = "issue_report"
    COMMUNITY_SUPPORT = "community_support"
    MENTORSHIP = "mentorship"

class DiscussionCategory(str, Enum):
    """Discussion forum categories"""
    GENERAL = "general"
    RESEARCH = "research"
    BUGS = "bugs"
    FEATURES = "features"
    HELP = "help"
    SHOWCASE = "showcase"
    GOVERNANCE = "governance"

# Pydantic Models
class User(BaseModel):
    """User model"""
    id: str
    username: str
    email: EmailStr
    role: UserRole = UserRole.GUEST
    github_username: Optional[str] = None
    discord_id: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True

class UserCreate(BaseModel):
    """User creation model"""
    username: str
    email: EmailStr
    password: str
    github_username: Optional[str] = None

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str

class Contribution(BaseModel):
    """Contribution model"""
    id: str
    user_id: str
    type: ContributionType
    title: str
    description: str
    url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, approved, rejected
    reviewers: List[str] = Field(default_factory=list)
    score: float = 0.0

class Discussion(BaseModel):
    """Discussion forum model"""
    id: str
    title: str
    content: str
    category: DiscussionCategory
    author_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = Field(default_factory=list)
    upvotes: int = 0
    downvotes: int = 0
    is_pinned: bool = False
    is_locked: bool = False
    reply_count: int = 0

class Reply(BaseModel):
    """Discussion reply model"""
    id: str
    discussion_id: str
    author_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    upvotes: int = 0
    downvotes: int = 0
    is_solution: bool = False

class MentorshipRequest(BaseModel):
    """Mentorship program model"""
    id: str
    mentor_id: str
    mentee_id: str
    topic: str
    description: str
    status: str = "pending"  # pending, active, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    goals: List[str] = Field(default_factory=list)
    session_notes: List[str] = Field(default_factory=list)

class Badge(BaseModel):
    """Achievement badge model"""
    id: str
    name: str
    description: str
    icon_url: Optional[str] = None
    requirement: str
    category: str  # contribution, expertise, community, special
    rarity: str  # common, rare, epic, legendary

# FastAPI App
app = FastAPI(
    title="SuperInstance Community Platform",
    description="Community engagement and collaboration platform for SuperInstance",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
settings = Settings()

# In-memory data storage (replace with database in production)
users_db: Dict[str, User] = {}
contributions_db: Dict[str, Contribution] = {}
discussions_db: Dict[str, Discussion] = {}
replies_db: Dict[str, Reply] = {}
mentorships_db: Dict[str, MentorshipRequest] = {}
badges_db: Dict[str, Badge] = {
    "first_commit": Badge(
        id="first_commit",
        name="First Commit",
        description="Made your first commit to SuperInstance",
        requirement="1 merged commit",
        category="contribution",
        rarity="common"
    ),
    "pr_master": Badge(
        id="pr_master",
        name="PR Master",
        description="Merged 10+ pull requests",
        requirement="10 merged PRs",
        category="contribution",
        rarity="rare"
    ),
    "code_reviewer": Badge(
        id="code_reviewer",
        name="Code Reviewer",
        description="Reviewed 50+ pull requests",
        requirement="50 PR reviews",
        category="contribution",
        rarity="epic"
    ),
    "researcher": Badge(
        id="researcher",
        name="Researcher",
        description="Contributed to a research paper",
        requirement="1 paper contribution",
        category="expertise",
        rarity="rare"
    ),
    "mentor": Badge(
        id="mentor",
        name="Mentor",
        description="Mentored 5+ new contributors",
        requirement="5 mentees completed",
        category="community",
        rarity="epic"
    ),
    "early_adopter": Badge(
        id="early_adopter",
        name="Early Adopter",
        description="Joined in the first month of open source",
        requirement="Joined before 2026-04-15",
        category="special",
        rarity="legendary"
    )
}

# Helper Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def get_current_user(token_payload: dict = Depends(verify_token)) -> User:
    """Get current authenticated user"""
    user_id = token_payload.get("sub")
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return users_db[user_id]

def calculate_reputation_score(user_id: str) -> float:
    """Calculate user reputation score"""
    user = users_db.get(user_id)
    if not user:
        return 0.0

    user_contributions = [c for c in contributions_db.values() if c.user_id == user_id]
    approved_contributions = [c for c in user_contributions if c.status == "approved"]

    score = 0.0
    for contribution in approved_contributions:
        if contribution.type == ContributionType.CODE:
            score += 10.0
        elif contribution.type == ContributionType.RESEARCH:
            score += 25.0
        elif contribution.type == ContributionType.DOCUMENTATION:
            score += 5.0
        elif contribution.type == ContributionType.REVIEW:
            score += 3.0
        elif contribution.type == ContributionType.ISSUE_REPORT:
            score += 2.0
        elif contribution.type == ContributionType.MENTORSHIP:
            score += 15.0

    # Bonus for diverse contributions
    types = set(c.type for c in approved_contributions)
    if len(types) >= 3:
        score *= 1.2  # 20% bonus for diversity

    return round(score, 2)

def assign_badge(user_id: str, badge_id: str) -> bool:
    """Assign badge to user if they meet requirements"""
    if badge_id not in badges_db:
        return False

    user = users_db.get(user_id)
    if not user or badge_id in getattr(user, 'badges', []):
        return False

    # Check if user meets badge requirements
    user_contributions = [c for c in contributions_db.values() if c.user_id == user_id and c.status == "approved"]

    badge_awarded = False
    if badge_id == "first_commit" and len(user_contributions) >= 1:
        badge_awarded = True
    elif badge_id == "pr_master" and len([c for c in user_contributions if c.type == ContributionType.CODE]) >= 10:
        badge_awarded = True
    elif badge_id == "code_reviewer" and len([c for c in user_contributions if c.type == ContributionType.REVIEW]) >= 50:
        badge_awarded = True
    elif badge_id == "researcher" and len([c for c in user_contributions if c.type == ContributionType.RESEARCH]) >= 1:
        badge_awarded = True
    elif badge_id == "early_adopter" and user.created_at < datetime(2026, 4, 15):
        badge_awarded = True

    if badge_awarded:
        if not hasattr(user, 'badges'):
            user.badges = []
        user.badges.append(badge_id)
        return True

    return False

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SuperInstance Community Platform",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "users": len(users_db),
        "contributions": len(contributions_db),
        "discussions": len(discussions_db)
    }

# User Management
@app.post("/api/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    if any(u.email == user_data.email for u in users_db.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    user_id = hashlib.sha256(user_data.email.encode()).hexdigest()[:16]
    user = User(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        role=UserRole.GUEST
    )
    users_db[user_id] = user

    # Check for early adopter badge
    assign_badge(user_id, "early_adopter")

    return user

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Login user and return access token"""
    user = next((u for u in users_db.values() if u.email == credentials.email), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return users_db[user_id]

@app.get("/api/users/{user_id}/stats", response_model=ContributorStats)
async def get_user_stats(user_id: str):
    """Get user contribution statistics"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user_contributions = [c for c in contributions_db.values() if c.user_id == user_id]
    approved = [c for c in user_contributions if c.status == "approved"]

    stats = ContributorStats(
        total_commits=len([c for c in approved if c.type == ContributionType.CODE]),
        total_prs=len([c for c in approved if "pull_request" in c.metadata]),
        total_reviews=len([c for c in approved if c.type == ContributionType.REVIEW]),
        total_issues=len([c for c in approved if c.type == ContributionType.ISSUE_REPORT]),
        reputation_score=calculate_reputation_score(user_id),
        joined_date=users_db[user_id].created_at,
        last_activity=max([c.created_at for c in user_contributions]) if user_contributions else None,
        badges=users_db[user_id].badges if hasattr(users_db[user_id], 'badges') else []
    )

    # Assign rank based on reputation
    if stats.reputation_score >= 500:
        stats.rank = "Legendary"
    elif stats.reputation_score >= 200:
        stats.rank = "Expert"
    elif stats.reputation_score >= 100:
        stats.rank = "Senior"
    elif stats.reputation_score >= 50:
        stats.rank = "Contributor"
    else:
        stats.rank = "Apprentice"

    return stats

@app.get("/api/users", response_model=List[User])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[UserRole] = None
):
    """List users with pagination and filtering"""
    users = list(users_db.values())
    if role:
        users = [u for u in users if u.role == role]
    return users[skip:skip+limit]

@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 50):
    """Get contributor leaderboard"""
    leaderboard = []
    for user_id in users_db.keys():
        stats = await get_user_stats(user_id)
        leaderboard.append({
            "user": users_db[user_id],
            "stats": stats
        })

    leaderboard.sort(key=lambda x: x["stats"].reputation_score, reverse=True)
    return leaderboard[:limit]

# Contribution Tracking
@app.post("/api/contributions", response_model=Contribution, status_code=status.HTTP_201_CREATED)
async def create_contribution(
    contribution: Contribution,
    current_user: User = Depends(get_current_user)
):
    """Create a new contribution"""
    contribution.id = hashlib.sha256(
        f"{contribution.user_id}{contribution.type}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]
    contribution.user_id = current_user.id
    contributions_db[contribution.id] = contribution

    # Check for badges
    if contribution.type == ContributionType.CODE:
        assign_badge(current_user.id, "first_commit")

    return contribution

@app.get("/api/contributions/{contribution_id}", response_model=Contribution)
async def get_contribution(contribution_id: str):
    """Get contribution by ID"""
    if contribution_id not in contributions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contribution not found"
        )
    return contributions_db[contribution_id]

@app.get("/api/contributions", response_model=List[Contribution])
async def list_contributions(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[str] = None,
    type: Optional[ContributionType] = None,
    status: Optional[str] = None
):
    """List contributions with filtering"""
    contributions = list(contributions_db.values())

    if user_id:
        contributions = [c for c in contributions if c.user_id == user_id]
    if type:
        contributions = [c for c in contributions if c.type == type]
    if status:
        contributions = [c for c in contributions if c.status == status]

    contributions.sort(key=lambda x: x.created_at, reverse=True)
    return contributions[skip:skip+limit]

@app.put("/api/contributions/{contribution_id}", response_model=Contribution)
async def update_contribution(
    contribution_id: str,
    status: str,
    score: float = 0.0,
    current_user: User = Depends(get_current_user)
):
    """Update contribution status (maintainers only)"""
    if current_user.role not in [UserRole.MAINTAINER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    if contribution_id not in contributions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contribution not found"
        )

    contribution = contributions_db[contribution_id]
    contribution.status = status
    contribution.score = score

    # Check for badges
    if status == "approved":
        if contribution.type == ContributionType.CODE:
            assign_badge(contribution.user_id, "pr_master")
        elif contribution.type == ContributionType.REVIEW:
            assign_badge(contribution.user_id, "code_reviewer")
        elif contribution.type == ContributionType.RESEARCH:
            assign_badge(contribution.user_id, "researcher")

    return contribution

# Discussion Forums
@app.post("/api/discussions", response_model=Discussion, status_code=status.HTTP_201_CREATED)
async def create_discussion(
    discussion: Discussion,
    current_user: User = Depends(get_current_user)
):
    """Create a new discussion"""
    discussion.id = hashlib.sha256(
        f"{discussion.title}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]
    discussion.author_id = current_user.id
    discussions_db[discussion.id] = discussion
    return discussion

@app.get("/api/discussions/{discussion_id}", response_model=Discussion)
async def get_discussion(discussion_id: str):
    """Get discussion by ID"""
    if discussion_id not in discussions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion not found"
        )
    return discussions_db[discussion_id]

@app.get("/api/discussions", response_model=List[Discussion])
async def list_discussions(
    skip: int = 0,
    limit: int = 50,
    category: Optional[DiscussionCategory] = None,
    tag: Optional[str] = None
):
    """List discussions with filtering"""
    discussions = list(discussions_db.values())

    if category:
        discussions = [d for d in discussions if d.category == category]
    if tag:
        discussions = [d for d in discussions if tag in d.tags]

    discussions.sort(key=lambda x: x.updated_at, reverse=True)
    return discussions[skip:skip+limit]

@app.post("/api/discussions/{discussion_id}/replies", response_model=Reply, status_code=status.HTTP_201_CREATED)
async def create_reply(
    discussion_id: str,
    reply: Reply,
    current_user: User = Depends(get_current_user)
):
    """Create a reply to a discussion"""
    if discussion_id not in discussions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion not found"
        )

    reply.id = hashlib.sha256(
        f"{discussion_id}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]
    reply.discussion_id = discussion_id
    reply.author_id = current_user.id
    replies_db[reply.id] = reply

    # Update discussion
    discussion = discussions_db[discussion_id]
    discussion.reply_count += 1
    discussion.updated_at = datetime.utcnow()

    return reply

@app.put("/api/discussions/{discussion_id}/vote")
async def vote_discussion(
    discussion_id: str,
    vote_type: str,  # upvote or downvote
    current_user: User = Depends(get_current_user)
):
    """Vote on a discussion"""
    if discussion_id not in discussions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion not found"
        )

    discussion = discussions_db[discussion_id]
    if vote_type == "upvote":
        discussion.upvotes += 1
    elif vote_type == "downvote":
        discussion.downvotes += 1

    return {"message": "Vote recorded", "upvotes": discussion.upvotes, "downvotes": discussion.downvotes}

# Mentorship Program
@app.post("/api/mentorship/request", response_model=MentorshipRequest, status_code=status.HTTP_201_CREATED)
async def request_mentorship(
    mentorship: MentorshipRequest,
    current_user: User = Depends(get_current_user)
):
    """Request mentorship from a senior contributor"""
    mentorship.id = hashlib.sha256(
        f"{mentorship.mentor_id}{mentorship.mentee_id}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]
    mentorship.mentee_id = current_user.id
    mentorships_db[mentorship.id] = mentorship
    return mentorship

@app.get("/api/mentorship/requests", response_model=List[MentorshipRequest])
async def list_mentorship_requests(
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None
):
    """List mentorship requests"""
    requests = list(mentorships_db.values())

    # Filter by user involvement
    requests = [r for r in requests if r.mentor_id == current_user.id or r.mentee_id == current_user.id]

    if status:
        requests = [r for r in requests if r.status == status]

    return requests

@app.put("/api/mentorship/{request_id}/status")
async def update_mentorship_status(
    request_id: str,
    new_status: str,
    current_user: User = Depends(get_current_user)
):
    """Update mentorship request status"""
    if request_id not in mentorships_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentorship request not found"
        )

    mentorship = mentorships_db[request_id]
    if mentorship.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    mentorship.status = new_status
    if new_status == "active":
        mentorship.started_at = datetime.utcnow()
    elif new_status == "completed":
        mentorship.completed_at = datetime.utcnow()
        # Check for mentor badge
        assign_badge(current_user.id, "mentor")

    return mentorship

# Badges
@app.get("/api/badges", response_model=List[Badge])
async def list_badges():
    """List all available badges"""
    return list(badges_db.values())

@app.get("/api/users/{user_id}/badges")
async def get_user_badges(user_id: str):
    """Get user badges"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user = users_db[user_id]
    user_badges = user.badges if hasattr(user, 'badges') else []
    return [
        badges_db[badge_id]
        for badge_id in user_badges
        if badge_id in badges_db
    ]

# GitHub Webhook (for automation)
@app.post("/api/webhooks/github")
async def github_webhook(
    payload: dict,
    background_tasks: BackgroundTasks
):
    """Handle GitHub webhook events for automated contribution tracking"""
    event_type = payload.get("action")

    if event_type in ["opened", "closed", "merged"]:
        # Auto-create contribution from PR
        pr_data = payload.get("pull_request", {})
        contribution = Contribution(
            id=hashlib.sha256(pr_data.get("url", "").encode()).hexdigest()[:16],
            user_id=pr_data.get("user", {}).get("login", ""),
            type=ContributionType.CODE,
            title=pr_data.get("title", ""),
            description=pr_data.get("body", ""),
            url=pr_data.get("html_url"),
            metadata={
                "pull_request": True,
                "number": pr_data.get("number"),
                "additions": pr_data.get("additions", 0),
                "deletions": pr_data.get("deletions", 0)
            },
            status="approved" if pr_data.get("merged") else "pending"
        )
        contributions_db[contribution.id] = contribution

    return {"status": "processed"}

# Statistics
@app.get("/api/stats/community")
async def get_community_stats():
    """Get overall community statistics"""
    return {
        "total_users": len(users_db),
        "active_users": len([u for u in users_db.values() if (datetime.utcnow() - u.last_login).days < 30 if u.last_login else False]),
        "total_contributions": len(contributions_db),
        "approved_contributions": len([c for c in contributions_db.values() if c.status == "approved"]),
        "total_discussions": len(discussions_db),
        "active_mentorships": len([m for m in mentorships_db.values() if m.status == "active"]),
        "badges_awarded": sum(len(u.badges) for u in users_db.values() if hasattr(u, 'badges'))
    }

# Run with: uvicorn community_platform:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
