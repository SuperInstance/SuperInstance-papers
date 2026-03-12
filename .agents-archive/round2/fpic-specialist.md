# Round 2 Agent: FPIC Implementation Specialist

**Mission**: Design the Free, Prior, and Informed Consent (FPIC) protocol for indigenous knowledge attribution in POLLN.

---

## Context from Round 1

Round 1 Cross-Cultural Philosophy research established:
- Distributed intelligence is **universal across cultures**
- Many concepts require **FPIC before use**
- Some concepts are **ABSOLUTELY restricted**

**Sensitivity Matrix from Round 1:**

| Concept | FPIC Required | Sensitivity |
|---------|---------------|-------------|
| Logos, Nous | No | Low |
| Dao, Wu Wei | Recommended | Medium |
| Dharma, Svadharma | Recommended | High |
| Great Law of Peace | **REQUIRED** | High |
| Wampum Belts | **ABSOLUTE** | Extreme |
| Mitakuye Oyasin | **REQUIRED** | High |
| Amazonian visions | **ABSOLUTE** | Extreme |

---

## Research Questions

1. **FPIC Protocol Design**
   - What constitutes "free" consent?
   - What constitutes "prior" consent?
   - What constitutes "informed" consent?
   - How to document and verify consent?

2. **Attribution System**
   - How to track concept origins?
   - How to attribute properly?
   - How to handle derivative works?

3. **Access Control**
   - How to implement concept restrictions?
   - How to handle ABSOLUTE restrictions?
   - How to prevent unauthorized use?

4. **Community Engagement**
   - How to identify appropriate communities?
   - How to establish contact respectfully?
   - How to maintain ongoing relationships?

5. **Legal/Compliance Framework**
   - What legal frameworks apply?
   - How to ensure compliance?
   - What are the liability considerations?

---

## Required Outputs

1. **FPIC Protocol Specification**
   ```
   FPIC Process:
   1. Identification: Determine if concept requires FPIC
   2. Contact: Reach out to appropriate community
   3. Consultation: Explain intended use
   4. Consent: Obtain documented agreement
   5. Implementation: Apply consent terms
   6. Monitoring: Ongoing compliance
   ```

2. **Attribution System Design**
   - Concept registry schema
   - Attribution metadata format
   - Derivative work tracking

3. **Access Control Mechanism**
   - Concept restriction levels
   - Enforcement mechanisms
   - Audit logging

4. **Community Engagement Guide**
   - Contact protocols
   - Communication templates
   - Relationship maintenance

5. **Compliance Checklist**
   - Legal requirements by jurisdiction
   - Risk assessment framework
   - Regular review process

---

## UN Declaration on Indigenous Rights (UNDRIP)

Article 31:
> Indigenous peoples have the right to maintain, control, protect and develop their cultural heritage, traditional knowledge and traditional cultural expressions...

This requires:
- **Free**: No coercion or manipulation
- **Prior**: Before any action taken
- **Informed**: Full understanding of implications
- **Consent**: Explicit agreement

---

## Implementation Principles

1. **Nothing About Us Without Us**
   - Indigenous communities must be involved in decisions
   - No unilateral implementation

2. **Respect for Sovereignty**
   - Communities own their knowledge
   - POLLN is a guest, not owner

3. **Benefit Sharing**
   - If knowledge creates value, communities benefit
   - Transparent benefit distribution

4. **Right of Refusal**
   - Communities can say no
   - No means no, absolutely

5. **Ongoing Consent**
   - Consent can be withdrawn
   - Regular re-affirmation required

---

## Technical Implementation

```typescript
interface ConceptAttribution {
  id: string;
  name: string;
  origin: CulturalOrigin;
  fpicStatus: 'not_required' | 'recommended' | 'required' | 'absolute';
  consentDoc?: ConsentDocument;
  restrictions: Restriction[];
  benefits: BenefitSharing[];
}

interface ConsentDocument {
  community: string;
  representatives: string[];
  date: Date;
  terms: string[];
  renewalDate: Date;
}
```

---

## Success Criteria

- [ ] FPIC protocol documented
- [ ] Attribution system designed
- [ ] Access control implemented
- [ ] Engagement guide created
- [ ] Compliance checklist complete
- [ ] Community review process defined

---

## Critical Note

This is not just technical—it's ethical and legal. FPIC implementation must involve actual community consultation, not just research. The outputs here are design documents, not final implementation.

---

## Output Location

Write findings to: `docs/research/round2-fpic-implementation.md`

Report synthesis to: `docs/round2-synthesis/README.md`
