"""
Virtual Seminar Series Management
==================================

Manages virtual research seminars for global collaboration, including
scheduling, presentations, and attendee coordination across timezones.

Features:
- Cross-timezone scheduling optimization
- Presentation management
- Attendee registration and coordination
- Recording and archiving
- Q&A and discussion management
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json
from pathlib import Path


class SeminarFormat(Enum):
    """Types of seminar formats"""
    RESEARCH_PRESENTATION = "research_presentation"
    WORK_IN_PROGRESS = "work_in_progress"
    TUTORIAL = "tutorial"
    PANEL_DISCUSSION = "panel_discussion"
    KEYNOTE = "keynote"
    DEMO = "demo"


class SeminarFrequency(Enum):
    """Frequency of seminar series"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    AD_HOC = "ad_hoc"


class AttendanceStatus(Enum):
    """Registration status"""
    REGISTERED = "registered"
    ATTENDED = "attended"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


@dataclass
class SeminarSession:
    """Individual seminar session"""
    session_id: str
    title: str
    description: str
    format: SeminarFormat

    # Scheduling
    scheduled_start: datetime
    scheduled_end: datetime
    timezone: str = "UTC"

    # Presenters
    presenter_ids: List[str] = field(default_factory=list)
    presenter_institutions: List[str] = field(default_factory=list)

    # Content
    abstract: str = ""
    papers_discussed: List[str] = field(default_factory=list)
    presentation_materials: List[str] = field(default_factory=list)  # URLs

    # Platform
    platform: str = "Zoom"  # Zoom, Teams, Google Meet, etc.
    meeting_url: str = ""
    meeting_id: str = ""
    password: str = ""

    # Registration
    max_attendees: int = 100
    registered_attendees: List[str] = field(default_factory=list)
    waitlist: List[str] = field(default_factory=list)

    # Recording
    will_be_recorded: bool = True
    recording_url: str = ""

    # Status
    is_cancelled: bool = False
    cancellation_reason: str = ""

    # Attendance tracking
    actual_attendees: List[str] = field(default_factory=list)
    no_show_attendees: List[str] = field(default_factory=list)

    # Q&A
    qa_session_duration_minutes: int = 15
    questions_submitted: List[Dict] = field(default_factory=list)

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class SeminarSeries:
    """Recurring seminar series"""
    series_id: str
    name: str
    description: str
    frequency: SeminarFrequency

    # Organizers
    organizer_ids: List[str] = field(default_factory=list)
    host_institution: str = ""

    # Focus
    research_areas: List[str] = field(default_factory=list)
    papers_in_scope: List[str] = field(default_factory=list)

    # Schedule
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    default_time: Optional[str] = None  # "14:00 UTC"
    duration_minutes: int = 60

    # Sessions
    sessions: List[str] = field(default_factory=list)  # session_ids

    # Subscription
    mailing_list: List[str] = field(default_factory=list)
    calendar_url: str = ""

    # Status
    is_active: bool = True

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class Attendee:
    """Seminar attendee"""
    attendee_id: str
    name: str
    email: str
    institution: str
    timezone: str

    # Interests
    research_areas: List[str] = field(default_factory=list)
    papers_of_interest: List[str] = field(default_factory=list)

    # Attendance history
    sessions_registered: List[str] = field(default_factory=list)
    sessions_attended: List[str] = field(default_factory=list)
    sessions_missed: List[str] = field(default_factory=list)

    # Preferences
    wants_recording_notifications: bool = True
    wants_qa_submissions: bool = True

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


class SeminarManager:
    """
    Manages virtual seminar series and individual sessions.

    Features:
    - Timezone-aware scheduling
    - Registration management
    - Recording and archiving
    - Attendance tracking
    - Cross-timezone optimization
    """

    def __init__(self, data_dir: str = "data/seminars"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.series: Dict[str, SeminarSeries] = {}
        self.sessions: Dict[str, SeminarSession] = {}
        self.attendees: Dict[str, Attendee] = {}

        self._load_data()

    def _load_data(self):
        """Load seminar data from disk"""
        series_file = self.data_dir / "series.json"
        sessions_file = self.data_dir / "sessions.json"
        attendees_file = self.data_dir / "attendees.json"

        if series_file.exists():
            with open(series_file, 'r') as f:
                data = json.load(f)
                for sdata in data:
                    sdata["created"] = datetime.fromisoformat(sdata["created"])
                    sdata["updated"] = datetime.fromisoformat(sdata["updated"])
                    self.series[sdata["series_id"]] = SeminarSeries(**sdata)

        if sessions_file.exists():
            with open(sessions_file, 'r') as f:
                data = json.load(f)
                for sess_data in data:
                    sess_data["scheduled_start"] = datetime.fromisoformat(sess_data["scheduled_start"])
                    sess_data["scheduled_end"] = datetime.fromisoformat(sess_data["scheduled_end"])
                    sess_data["created"] = datetime.fromisoformat(sess_data["created"])
                    sess_data["updated"] = datetime.fromisoformat(sess_data["updated"])
                    self.sessions[sess_data["session_id"]] = SeminarSession(**sess_data)

        if attendees_file.exists():
            with open(attendees_file, 'r') as f:
                data = json.load(f)
                for adata in data:
                    adata["created"] = datetime.fromisoformat(adata["created"])
                    self.attendees[adata["attendee_id"]] = Attendee(**adata)

    def _save_data(self):
        """Save seminar data to disk"""
        series_file = self.data_dir / "series.json"
        sessions_file = self.data_dir / "sessions.json"
        attendees_file = self.data_dir / "attendees.json"

        with open(series_file, 'w') as f:
            json.dump(
                [s.__dict__ for s in self.series.values()],
                f,
                indent=2,
                default=str
            )

        with open(sessions_file, 'w') as f:
            json.dump(
                [s.__dict__ for s in self.sessions.values()],
                f,
                indent=2,
                default=str
            )

        with open(attendees_file, 'w') as f:
            json.dump(
                [a.__dict__ for a in self.attendees.values()],
                f,
                indent=2,
                default=str
            )

    def create_series(
        self,
        name: str,
        description: str,
        frequency: SeminarFrequency,
        organizer_ids: List[str],
        host_institution: str,
        research_areas: List[str],
        day_of_week: Optional[int] = None,
        default_time: Optional[str] = None,
        duration_minutes: int = 60
    ) -> SeminarSeries:
        """Create a new seminar series"""
        series_id = f"series_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        series = SeminarSeries(
            series_id=series_id,
            name=name,
            description=description,
            frequency=frequency,
            organizer_ids=organizer_ids,
            host_institution=host_institution,
            research_areas=research_areas,
            day_of_week=day_of_week,
            default_time=default_time,
            duration_minutes=duration_minutes
        )

        self.series[series_id] = series
        self._save_data()
        return series

    def schedule_session(
        self,
        series_id: str,
        title: str,
        description: str,
        format: SeminarFormat,
        presenter_ids: List[str],
        presenter_institutions: List[str],
        scheduled_start: datetime,
        duration_minutes: Optional[int] = None,
        abstract: str = "",
        papers_discussed: Optional[List[str]] = None,
        max_attendees: int = 100
    ) -> SeminarSession:
        """Schedule a new seminar session"""
        if series_id not in self.series:
            raise ValueError(f"Series {series_id} not found")

        series = self.series[series_id]

        # Calculate end time
        duration = duration_minutes or series.duration_minutes
        scheduled_end = scheduled_start + timedelta(minutes=duration)

        session_id = f"sess_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        session = SeminarSession(
            session_id=session_id,
            title=title,
            description=description,
            format=format,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            timezone=series.default_time.split()[-1] if series.default_time else "UTC",
            presenter_ids=presenter_ids,
            presenter_institutions=presenter_institutions,
            abstract=abstract,
            papers_discussed=papers_discussed or [],
            max_attendees=max_attendees
        )

        self.sessions[session_id] = session
        series.sessions.append(session_id)
        self._save_data()
        return session

    def register_attendee(
        self,
        attendee_id: str,
        name: str,
        email: str,
        institution: str,
        timezone: str,
        research_areas: Optional[List[str]] = None
    ) -> Attendee:
        """Register a new attendee"""
        attendee = Attendee(
            attendee_id=attendee_id,
            name=name,
            email=email,
            institution=institution,
            timezone=timezone,
            research_areas=research_areas or []
        )

        self.attendees[attendee_id] = attendee
        self._save_data()
        return attendee

    def register_for_session(
        self,
        session_id: str,
        attendee_id: str
    ) -> bool:
        """Register attendee for a session"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        if attendee_id not in self.attendees:
            raise ValueError(f"Attendee {attendee_id} not found")

        session = self.sessions[session_id]
        attendee = self.attendees[attendee_id]

        # Check capacity
        if len(session.registered_attendees) >= session.max_attendees:
            # Add to waitlist
            if attendee_id not in session.waitlist:
                session.waitlist.append(attendee_id)
            return False

        # Register
        if attendee_id not in session.registered_attendees:
            session.registered_attendees.append(attendee_id)
            attendee.sessions_registered.append(session_id)
            self._save_data()

        return True

    def find_optimal_time(
        self,
        participant_timezones: List[str],
        duration_minutes: int,
        preferred_days: Optional[List[int]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Tuple[datetime, float]]:
        """
        Find optimal times for seminar across timezones.

        Returns: List of (datetime, suitability_score) tuples
        """
        if start_date is None:
            start_date = datetime.now() + timedelta(days=1)
        if end_date is None:
            end_date = start_date + timedelta(days=30)

        # Generate candidate slots
        candidates = []
        current = start_date

        while current <= end_date:
            # Skip weekends if preferred days specified
            if preferred_days is None or current.weekday() in preferred_days:
                # Try start times from 8:00 to 20:00 UTC
                for hour in range(8, 21):
                    slot_start = current.replace(hour=hour, minute=0, second=0)
                    slot_end = slot_start + timedelta(minutes=duration_minutes)

                    # Calculate suitability score
                    score = self._calculate_time_suitability(
                        slot_start,
                        slot_end,
                        participant_timezones
                    )

                    candidates.append((slot_start, score))

            current += timedelta(days=1)

        # Sort by score descending
        candidates.sort(key=lambda x: x[1], reverse=True)

        return candidates[:10]  # Return top 10

    def _calculate_time_suitability(
        self,
        start_time: datetime,
        end_time: datetime,
        timezones: List[str]
    ) -> float:
        """
        Calculate suitability score for a time slot.

        Scoring:
        - 1.0: Perfect (9 AM - 5 PM local for all)
        - 0.5: Acceptable (6 AM - 9 PM local for all)
        - 0.0: Poor (outside acceptable hours for some)
        """
        if not timezones:
            return 0.5

        # This is a simplified version
        # Production would use proper timezone libraries (pytz, zoneinfo)

        # For each timezone, check if the time is reasonable
        perfect_count = 0
        acceptable_count = 0

        for tz in timezones:
            # Convert UTC to local time (simplified - just applying offset)
            # In production, use proper timezone conversion
            try:
                offset = self._parse_timezone_offset(tz)
                local_hour = (start_time.hour + offset) % 24

                # Perfect: 9 AM - 5 PM
                if 9 <= local_hour <= 17:
                    perfect_count += 1
                    acceptable_count += 1
                # Acceptable: 6 AM - 9 PM
                elif 6 <= local_hour <= 21:
                    acceptable_count += 1
            except:
                # If timezone parsing fails, assume neutral
                acceptable_count += 1

        total = len(timezones)

        if total == 0:
            return 0.5

        # Calculate score
        perfect_ratio = perfect_count / total
        acceptable_ratio = acceptable_count / total

        # Weight perfect times higher
        score = perfect_ratio * 1.0 + (acceptable_ratio - perfect_ratio) * 0.5

        return score

    def _parse_timezone_offset(self, tz_str: str) -> int:
        """Parse timezone offset in hours (simplified)"""
        try:
            if "UTC" in tz_str or "GMT" in tz_str:
                if "+" in tz_str:
                    return int(tz_str.split("+")[1][:2])
                elif "-" in tz_str:
                    return -int(tz_str.split("-")[1][:2])
                return 0
            # Add common timezones
            tz_offsets = {
                "America/New_York": -5,
                "America/Los_Angeles": -8,
                "Europe/London": 0,
                "Europe/Berlin": 1,
                "Asia/Tokyo": 9,
                "Asia/Shanghai": 8,
            }
            return tz_offsets.get(tz_str, 0)
        except:
            return 0

    def record_attendance(
        self,
        session_id: str,
        attendee_ids: List[str],
        no_show_ids: Optional[List[str]] = None
    ):
        """Record actual attendance for a session"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")

        session = self.sessions[session_id]

        session.actual_attendees = attendee_ids

        if no_show_ids:
            session.no_show_attendees = no_show_ids

        # Update attendee records
        for attendee_id in attendee_ids:
            if attendee_id in self.attendees:
                attendee = self.attendees[attendee_id]
                if session_id not in attendee.sessions_attended:
                    attendee.sessions_attended.append(session_id)

        for attendee_id in session.no_show_attendees:
            if attendee_id in self.attendees:
                attendee = self.attendees[attendee_id]
                if session_id not in attendee.sessions_missed:
                    attendee.sessions_missed.append(session_id)

        self._save_data()

    def get_upcoming_sessions(
        self,
        series_id: Optional[str] = None,
        max_results: int = 10
    ) -> List[SeminarSession]:
        """Get upcoming seminar sessions"""
        now = datetime.now()
        upcoming = []

        for session in self.sessions.values():
            if session.scheduled_start > now and not session.is_cancelled:
                if series_id is None or session.session_id in self.series.get(series_id, SeminarSeries(series_id="", name="", description="", frequency=SeminarFrequency.WEEKLY)).sessions:
                    upcoming.append(session)

        # Sort by start time
        upcoming.sort(key=lambda s: s.scheduled_start)

        return upcoming[:max_results]

    def generate_attendee_report(
        self,
        attendee_id: str
    ) -> Dict:
        """Generate attendance report for an attendee"""
        if attendee_id not in self.attendees:
            raise ValueError(f"Attendee {attendee_id} not found")

        attendee = self.attendees[attendee_id]

        registered_count = len(attendee.sessions_registered)
        attended_count = len(attendee.sessions_attended)
        missed_count = len(attendee.sessions_missed)

        attendance_rate = (
            attended_count / registered_count
            if registered_count > 0 else 0
        )

        return {
            "attendee_id": attendee_id,
            "name": attendee.name,
            "institution": attendee.institution,
            "sessions_registered": registered_count,
            "sessions_attended": attended_count,
            "sessions_missed": missed_count,
            "attendance_rate": f"{attendance_rate * 100:.1f}%"
        }


def main():
    """Example usage"""
    manager = SeminarManager()

    # Create a seminar series
    series = manager.create_series(
        name="SuperInstance Research Seminar",
        description="Weekly seminar on SuperInstance distributed systems research",
        frequency=SeminarFrequency.WEEKLY,
        organizer_ids=["org001", "org002"],
        host_institution="MIT",
        research_areas=["Distributed Systems", "Consensus Algorithms"],
        day_of_week=2,  # Tuesday
        default_time="14:00 UTC",
        duration_minutes=60
    )

    print(f"Created series: {series.name}")
    print(f"Series ID: {series.series_id}")

    # Schedule a session
    session = manager.schedule_session(
        series_id=series.series_id,
        title="Energy-Efficient Consensus in Edge Networks",
        description="Presenting new research on reducing energy consumption in distributed consensus protocols",
        format=SeminarFormat.RESEARCH_PRESENTATION,
        presenter_ids=["alice", "bob"],
        presenter_institutions=["MIT", "TUM"],
        scheduled_start=datetime.now() + timedelta(days=7),
        abstract="This talk presents novel energy-efficient consensus algorithms...",
        papers_discussed=["P12", "P13"],
        max_attendees=100
    )

    print(f"\nScheduled session: {session.title}")
    print(f"Session ID: {session.session_id}")
    print(f"Time: {session.scheduled_start.strftime('%Y-%m-%d %H:%M')} UTC")

    # Register attendees
    manager.register_attendee(
        attendee_id="attendee001",
        name="Dr. Carol Williams",
        email="carol@university.edu",
        institution="Stanford University",
        timezone="America/Los_Angeles",
        research_areas=["Distributed Systems"]
    )

    manager.register_for_session(session.session_id, "attendee001")

    print(f"\nRegistered attendee for session")

    # Find optimal time for multi-timezone session
    optimal_times = manager.find_optimal_time(
        participant_timezones=["UTC-5", "UTC+1", "UTC+9", "UTC-8"],
        duration_minutes=60,
        preferred_days=[1, 2, 3],  # Mon, Tue, Wed
        start_date=datetime.now() + timedelta(days=1),
        end_date=datetime.now() + timedelta(days=14)
    )

    print(f"\nOptimal times for cross-timezone session:")
    for time, score in optimal_times[:3]:
        print(f"  {time.strftime('%Y-%m-%d %H:%M')} UTC (score: {score:.2f})")


if __name__ == "__main__":
    main()
