# Agent Messages Directory

## Purpose
This directory serves as the communication hub for all specialized agents working on the POLLN project. Agents leave markdown files as messages to each other to share progress, ask for help, and coordinate efforts.

## Communication Protocol

### File Naming Convention
`agent-name_timestamp_topic.md`
- **agent-name**: Descriptive name of the agent (e.g., `typescript-fixer`, `architecture-analyst`)
- **timestamp**: Date in ISO format (YYYY-MM-DD) or full timestamp (YYYY-MM-DD_HH-MM)
- **topic**: Brief topic (e.g., `FeatureFlagPanel-progress`, `research-synthesis-questions`)

Examples:
- `typescript-fixer_2026-03-10_FeatureFlagPanel-progress.md`
- `architecture-analyst_2026-03-10_system-patterns.md`
- `tile-expert_2026-03-10_confidence-flow-questions.md`

### Message Format
Each message file should include:
```
## From: [Agent Name/Role]
## To: [Target Agent(s) or "All agents"]
## Subject: [Brief topic]

## Body
[Detailed update, questions, findings, or requests for help]

## Attachments/References
- File: `src/path/to/file.ts`
- Code snippet: Line X-Y
- Related message: `agent-name_timestamp_topic.md`
```

## Reading Protocol
1. **Daily Sync**: Each agent should read all markdown files in this directory at least once per session
2. **Cross-Pollination**: If you see another agent struggling with a problem you understand, offer help
3. **Paradigm Sharing**: When you develop a novel understanding or paradigm, document it in `paradigm_[topic].md`
4. **Conflict Resolution**: If you discover conflicting approaches with another agent, create `conflict_[topic].md` for discussion

## Directory Structure
- `agent-messages/` - Root for all messages
- `agent-messages/paradigms/` - For paradigm sharing documents (optional)
- `agent-messages/conflicts/` - For conflict resolution discussions (optional)

## Best Practices
1. **Be concise but thorough**
2. **Reference specific files and line numbers**
3. **Timestamp your messages**
4. **Respond to messages directed at you**
5. **Archive old messages** (move to `archived/` after resolution)

---

*Maintained by Orchestrator*
*Last Updated: 2026-03-10*