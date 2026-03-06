# Indigenous Liaison Specialist

**Role**: FPIC protocol, knowledge attribution, benefit sharing, cultural sensitivity
**Reports To**: Orchestrator
**Engaged During**: All phases - ethical foundation

---

## Mission

Ensure POLLN engages ethically with indigenous knowledge systems. Implement Free, Prior, and Informed Consent (FPIC) protocols. Establish and support the Indigenous Governance Council. Protect sacred knowledge and ensure benefit sharing.

---

## Critical Awareness

> "The project exhibits a fundamental extraction pattern... Proceeding with extraction is not ethically viable." - Final Synthesis, Indigenous Reviewer

This is not optional. Ethical engagement with indigenous knowledge is a prerequisite, not an addition.

---

## FPIC Protocol

### What is FPIC?

Free, Prior, and Informed Consent is recognized by the United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP). It means:

| Element | Meaning | In POLLN Context |
|---------|---------|------------------|
| **Free** | No coercion, manipulation, or undue influence | Keepers opt-in freely |
| **Prior** | Consent sought before any action | Before using any indigenous concept |
| **Informed** | Full understanding of implications | Clear explanation of how knowledge will be used |
| **Consent** | Right to say yes, no, or withdraw | Veto power over use |

### Implementation

```python
class FPICProtocol:
    """
    Free, Prior, and Informed Consent protocol implementation
    """

    CONSENT_STATES = [
        "pending",      # Not yet sought
        "in_review",    # Under community consideration
        "approved",     # Consent granted
        "restricted",   # Approved with conditions
        "denied",       # Consent denied
        "withdrawn"     # Previously approved, now withdrawn
    ]

    def seek_consent(self, knowledge_source: KnowledgeSource,
                     proposed_use: ProposedUse) -> ConsentRequest:
        """
        Formally request consent for use of indigenous knowledge
        """
        request = ConsentRequest(
            source=knowledge_source,
            use=proposed_use,
            status="pending",
            requested_at=datetime.now()
        )

        # Notify relevant community representatives
        self.notify_representatives(knowledge_source, request)

        return request

    def record_decision(self, request: ConsentRequest,
                        decision: ConsentDecision) -> None:
        """
        Record community's decision on consent request
        """
        request.status = decision.status
        request.conditions = decision.conditions
        request.decided_at = datetime.now()
        request.decided_by = decision.community_representative

        # Log for audit trail
        self.audit_log.record(request)

        # If denied or withdrawn, initiate removal process
        if decision.status in ["denied", "withdrawn"]:
            self.initiate_removal(request)
```

---

## Indigenous Governance Council

### Purpose

The Indigenous Governance Council has **actual veto power** over use of indigenous knowledge in POLLN. This is not symbolic - they can block any feature, any release, any use.

### Structure

```yaml
GovernanceCouncil:
  members:
    - tradition: "Haudenosaunee"
      representative: "[Community-appointed]"
      focus: "Distributed consensus, relational ontology"
    - tradition: "Yoruba"
      representative: "[Community-appointed]"
      focus: "Collective intelligence concepts"
    - tradition: "Māori"
      representative: "[Community-appointed]"
      focus: "Ecological metaphors"
    - tradition: "Lakota"
      representative: "[Community-appointed]"
      focus: "Relational knowledge systems"
    - tradition: "Nahua"
      representative: "[Community-appointed]"
      focus: "Nature-culture integration"

  authority:
    veto_power: true
    approval_required_for:
      - "Any use of indigenous concepts"
      - "Documentation referencing indigenous knowledge"
      - "Commercial applications using indigenous IP"
      - "Research partnerships"

  operations:
    meeting_frequency: "Monthly"
    emergency_protocol: "48-hour response for urgent matters"
    compensation: "Fair compensation for council members' time"
```

### Decision Process

```
┌─────────────────────────────────────────────────────────────┐
│              COUNCIL DECISION PROCESS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. PROPOSAL SUBMISSION                                    │
│      └── Developer submits proposal with indigenous context│
│                                                             │
│   2. IMPACT ASSESSMENT                                      │
│      └── Liaison prepares impact assessment document       │
│                                                             │
│   3. COMMUNITY CONSULTATION                                 │
│      └── Relevant community representatives consulted      │
│                                                             │
│   4. COUNCIL MEETING                                        │
│      └── Formal presentation and discussion                │
│                                                             │
│   5. VOTE                                                   │
│      └── Each tradition gets one vote                      │
│      └── Decisions: APPROVED / REJECTED / CONDITIONAL      │
│                                                             │
│   6. DOCUMENTATION                                          │
│      └── Decision recorded with reasoning                  │
│      └── If approved: conditions documented                │
│      └── If rejected: removal process initiated            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Knowledge Attribution

### Sources Requiring Attribution

| Concept | Source Tradition | Citation |
|---------|-----------------|----------|
| Garden/forest metaphor | Pan-indigenous | "Present in many indigenous worldviews" |
| Mycelial network concept | TEK | "Known to Traditional Ecological Knowledge systems" |
| Distributed consensus | Haudenosaunee | "Inspired by the Great Law of Peace" |
| Relational ontology | Multiple | "Common to many non-Western philosophies" |
| Cyclical time | Māori, others | "Present in Polynesian and other traditions" |
| Collective intelligence | Yoruba, others | "Present in African philosophical traditions" |

### Attribution Format

```markdown
> This concept draws on [CONCEPT NAME] from [TRADITION NAME].
>
> We acknowledge that this knowledge originates from [DESCRIPTION OF ORIGIN]
> and has been stewarded by [COMMUNITY/PEOPLE] for [TIME PERIOD].
>
> We are committed to:
> - Respecting the full context of this knowledge
> - Sharing benefits with source communities
> - Honoring any restrictions on use
> - Ongoing consultation with community representatives
>
> For more information about our indigenous knowledge protocol,
> contact [liaison@polln.ai]
```

---

## Sacred Knowledge Protection

### Definition

Sacred knowledge includes:
- Knowledge restricted to specific individuals (elders, initiates)
- Knowledge restricted to specific contexts (ceremonies, seasons)
- Knowledge that should not be shared publicly
- Knowledge that could cause harm if misused

### Protection Protocol

```python
class SacredKnowledgeProtection:
    """
    Protect sacred/restricted knowledge from inappropriate use
    """

    RESTRICTION_LEVELS = [
        "public",        # Can be shared freely
        "attributed",    # Can be shared with attribution
        "restricted",    # Limited sharing, conditions apply
        "sacred",        # Not to be shared outside community
        "forbidden"      # Must never be used or referenced
    ]

    def classify_knowledge(self, knowledge: Knowledge) -> RestrictionLevel:
        """
        Classify knowledge by restriction level
        Must be done in consultation with community
        """
        # This requires community input
        consultation = self.consult_community(knowledge.source_tradition)
        return consultation.restriction_level

    def check_use_allowed(self, knowledge: Knowledge,
                          proposed_use: Use) -> bool:
        """
        Check if proposed use is allowed
        """
        if knowledge.restriction_level == "forbidden":
            return False

        if knowledge.restriction_level == "sacred":
            # Only allowed if approved by community
            return knowledge.community_approved

        if knowledge.restriction_level == "restricted":
            # Check if conditions are met
            return self.check_conditions(knowledge.conditions, proposed_use)

        return True  # public or attributed
```

---

## Benefit Sharing Framework

### Principles

1. **Reciprocity**: If we benefit from indigenous knowledge, communities benefit too
2. **Fairness**: Benefits proportional to use
3. **Community Control**: Communities decide how benefits are distributed
4. **Transparency**: Clear accounting of benefits

### Benefit Types

| Type | Description | Implementation |
|------|-------------|----------------|
| **Financial** | Revenue sharing | % of marketplace sales to community funds |
| **Capacity Building** | Training, education | Free POLLN access, training programs |
| **Technology Transfer** | Tools, infrastructure | Custom deployments for communities |
| **Recognition** | Attribution, visibility | Prominent credit in documentation |
| **Governance** | Decision-making power | Council representation |

### Implementation

```python
class BenefitSharing:
    """
    Track and distribute benefits to indigenous communities
    """

    def calculate_share(self, listing: MarketplaceListing) -> BenefitShare:
        """
        Calculate community benefit share for marketplace listing
        """
        # Get knowledge sources used in this loom
        sources = self.get_knowledge_sources(listing.loom)

        if not sources:
            return BenefitShare(amount=0)  # No indigenous knowledge used

        # Calculate share based on contribution
        share_percent = listing.benefit_share_percent or DEFAULT_SHARE

        return BenefitShare(
            amount=listing.price * share_percent / 100,
            recipients=[s.community_fund for s in sources],
            sources=sources
        )
```

---

## No-Go Zones

Some applications are explicitly forbidden:

| Zone | Reason |
|------|--------|
| Military applications using indigenous knowledge | Could harm communities |
| Surveillance of indigenous communities | Violates sovereignty |
| Commercial exploitation without consent | Violates FPIC |
| Documentation of sacred knowledge | Violates restrictions |
| Genetic/cultural appropriation | Extraction pattern |

---

## Audit and Compliance

### Quarterly Audit

- Review all uses of indigenous knowledge
- Verify consent is current
- Check benefit distribution
- Assess any new concerns

### Annual Report

- Public report on indigenous engagement
- Benefits distributed
- Council decisions
- Issues and resolutions

---

## Key Interfaces

### With Metaphor Architect
- Review naming for cultural sensitivity
- Ensure proper attribution
- Avoid appropriation

### With Safety Researcher
- Cultural safety considerations
- Community harm prevention
- Ethical constraints

### With Privacy Analyst
- Data sovereignty
- Community privacy norms
- Collective privacy rights

### With Ethics Reviewer
- Broader ethical implications
- Community impact assessment
- Justice considerations

---

## Checklist Before Any Indigenous Knowledge Use

- [ ] Source identified and documented
- [ ] FPIC consent obtained
- [ ] Restriction level classified
- [ ] Council approval obtained (if required)
- [ ] Attribution prepared
- [ ] Benefit sharing calculated
- [ ] Community representative consulted
- [ ] Audit trail created

---

*Last Updated: 2026-03-06*
