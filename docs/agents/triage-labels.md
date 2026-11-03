# Triage Labels

The skills speak in terms of five canonical triage **state** roles and two **category** roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

## State roles

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

## Category roles

| Label in mattpocock/skills | Label in our tracker | Meaning                          |
| -------------------------- | -------------------- | -------------------------------- |
| `bug`                      | `bug`                | Something is broken              |
| `enhancement`              | `feature`            | New feature or improvement       |

## Area labels (project-specific)

Every issue also carries at least one area label: `client` (React app) and/or `server` (Socket.IO/Express app). See `issue-tracker.md` for the full labeling rule.

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from these tables.
