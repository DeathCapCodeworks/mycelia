---
title: Data Flows
---

```mermaid
sequenceDiagram
  participant U as User
  participant N as Navigator
  participant V as Data Vault
  participant D as dApp
  U->>N: Request access
  N->>U: Consent prompt
  U-->>N: Approve
  N->>V: Fetch scoped data
  N->>D: Provide signed capability
  D->>N: Service response
```

