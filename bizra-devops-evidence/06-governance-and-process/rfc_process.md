# BIZRA RFC Process

> Evidence for: GOV-002

## Overview

Request for Comments (RFC) is the process for proposing and deciding on significant technical changes to BIZRA Genesis Node. RFCs ensure thoughtful consideration of major decisions with input from stakeholders.

## When to Write an RFC

Write an RFC for:
- New system components or services
- Major architectural changes
- New external dependencies
- Breaking API changes
- Security model changes
- Performance-critical optimizations
- Process changes affecting multiple teams

Do NOT need an RFC:
- Bug fixes
- Minor feature additions
- Documentation updates
- Routine maintenance
- Changes covered by existing RFCs

## RFC Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Draft  │────▶│ Review  │────▶│ Decision│────▶│  Final  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     │               │               │               │
     ▼               ▼               ▼               ▼
  Author          Open for       Accept/          Implementation
  writes          comments       Reject/          or Archive
                                 Defer
```

### States

| State | Description | Duration |
|-------|-------------|----------|
| Draft | Author is writing RFC | Until submitted |
| Review | Open for comments | 5-10 business days |
| Final Comment | Last call for feedback | 3 business days |
| Accepted | Approved for implementation | - |
| Rejected | Not approved | - |
| Deferred | Postponed for future | - |
| Superseded | Replaced by newer RFC | - |
| Implemented | Work completed | - |

## RFC Format

### Template

```markdown
# RFC-XXXX: [Title]

## Metadata
- **Author:** [Name]
- **Status:** Draft
- **Created:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Reviewers:** [Names]

## Summary

[One paragraph summary of the proposal]

## Motivation

[Why is this change needed? What problem does it solve?]

## Detailed Design

[Technical details of the proposal]

### API Changes

[If applicable, describe API changes]

### Data Model Changes

[If applicable, describe schema changes]

### Security Considerations

[Security implications and mitigations]

### Performance Considerations

[Performance impact analysis]

## Alternatives Considered

[What other approaches were considered and why were they rejected?]

## Migration Plan

[How will existing systems transition to the new design?]

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ... | ... | ... | ... |

## Timeline

[Proposed implementation timeline]

## Open Questions

[Questions that need resolution during review]

## References

[Links to related documents, prior art, etc.]

---

## Discussion

[Comments and discussion go here during review]
```

## RFC Numbering

RFCs are numbered sequentially: RFC-0001, RFC-0002, etc.

Categories (prefix):
- `ARCH-` Architecture decisions
- `SEC-` Security changes
- `API-` API design
- `PROC-` Process changes
- `INFRA-` Infrastructure changes

Example: `RFC-0042-ARCH: Service Mesh Adoption`

## Review Process

### 1. Draft Submission

Author:
1. Create RFC document using template
2. Submit PR to `rfcs/` directory
3. Assign initial reviewers
4. Announce in #engineering-rfcs

### 2. Review Period

Reviewers should evaluate:
- **Correctness:** Is the technical approach sound?
- **Completeness:** Are all aspects addressed?
- **Clarity:** Is it understandable?
- **Feasibility:** Can it be implemented?
- **Alignment:** Does it fit our architecture?

Comment types:
- 🟢 **Minor:** Suggestion, non-blocking
- 🟡 **Major:** Needs addressing before approval
- 🔴 **Blocking:** Must be resolved

### 3. Final Comment Period (FCP)

After initial review:
1. Author addresses all comments
2. Announce FCP start
3. 3 business days for final input
4. Proceed to decision

### 4. Decision

Decision makers (varies by RFC scope):
- **Team-scope:** Tech Lead
- **Service-scope:** Engineering Manager
- **System-scope:** VP Engineering + Architecture Board

Possible outcomes:
- **Accept:** Proceed with implementation
- **Accept with modifications:** Specific changes required
- **Reject:** Documented reasons provided
- **Defer:** Revisit at specified time

## Roles

### Author
- Write and maintain RFC
- Respond to comments
- Incorporate feedback
- Update based on decision

### Reviewer
- Provide constructive feedback
- Evaluate technical merit
- Flag concerns early

### Shepherd (optional)
- Guide RFC through process
- Ensure timely progress
- Facilitate discussion

### Decision Maker
- Make final accept/reject decision
- Document reasoning
- Approve implementation plan

## Best Practices

### Writing RFCs

1. **Be specific:** Vague proposals are hard to evaluate
2. **Show your work:** Include alternatives considered
3. **Think about migration:** Existing systems matter
4. **Consider security:** Always include security analysis
5. **Keep it focused:** One RFC, one decision

### Reviewing RFCs

1. **Be constructive:** Suggest improvements, not just problems
2. **Be timely:** Review within the comment period
3. **Be thorough:** Consider edge cases
4. **Separate concerns:** Distinguish blocking vs. nice-to-have

### After Acceptance

1. Create implementation tickets
2. Reference RFC in code/commits
3. Update RFC with implementation status
4. Mark RFC as implemented when done

## Storage

RFCs stored in:
```
bizra-devops-evidence/
└── 06-governance-and-process/
    └── artifacts/
        └── sample_rfcs/
            ├── RFC-0001-ARCH-consensus-engine.md
            ├── RFC-0002-SEC-authentication-redesign.md
            └── ...
```

## Metrics

| Metric | Target |
|--------|--------|
| Time from draft to decision | < 15 business days |
| RFCs accepted per quarter | Tracked, not targeted |
| Implementation completion rate | > 80% within 2 quarters |

## Examples

See `artifacts/sample_rfcs/` for examples of accepted RFCs.

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-27 | Platform Team | Initial release |
