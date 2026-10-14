---
name: content-strategy
description: Master router for generic data modeling, entity structures, and realistic UI content generation for Basecoat.
---

# Content Strategy & Realistic Mock Data

## Guardrails

* **Zero Lazy Placeholders**: Using "Lorem Ipsum", "Test 1", "John Doe 1", or repetitive filler content is strictly **FORBIDDEN**. You MUST generate realistic, domain-appropriate mock copy, business labels, and numeric values.
* **Deterministic Typography**: Use `tabular-nums` for all numeric, monetary, and statistical data to ensure numbers align neatly in columns and cards. Use `font-mono` for system IDs, hashes, and code keys.

## Entity Data Modeling Standards

When generating mock data for Basecoat components, adhere strictly to the following structural entity shapes:

### 1. People & Accounts
* **Identity**: Realistic Full Name (e.g., "Sarah Connor", "Alexandre Dumas"), Avatar initials or SVG avatar, and a formatted alphanumeric system ID (e.g., `USR-8921`).
* **Contact & State**: Corporate email (e.g., `s.connor@cyberdyne.io`), Role Badge (`Admin`, `Editor`, `Member`, `Billing Admin`), Status Pill (`Active`, `Invited`, `Suspended`), and contextual temporal metadata (`Active 14m ago`).

### 2. Objects & Inventory
* **Identification**: Descriptive item title, thumbnail icon wrapper, and standard formatted alphanumeric SKU/ID (e.g., `ITM-402-B`).
* **Classification**: Specific category badge (e.g., `Hardware`, `SaaS License`), precise price (`$249.00`), stock count (`18 in stock`), and an availability badge (`In Stock`, `Low Stock`, `Backordered`).

### 3. Transactions & Ledgers
* **Data Completeness**: Exact Transaction ID (e.g., `TXN-9982-A`), precise monetary values with currency symbol and cents (`$1,240.00`), payment counterparty/method (`Visa •••• 4242`, `ACH Direct`), semantic clearing state (`Paid`, `Processing`, `Refunded`, `Failed`), and standard localized timestamp (`Oct 14, 2026, 14:32`).

### 4. Tasks, Events & Documents
* **Tasks**: Action-oriented task titles (e.g., "Implement APCA contrast check"), issue tracking keys (`ENG-142`, `SEC-89`), assignee avatar, priority badge (`Critical`, `High`, `Medium`, `Low`), and realistic due dates (`Due tomorrow`).
* **Events & Audit Logs**: High-precision timestamps (`font-mono text-xs`), severity indicator, actor identity, standard verb-noun action key (`user.session_start`, `api_key.rotated`, `invoice.disputed`), and metadata badges.
* **Documents**: File type icon, realistic filename with extension (e.g., `Q3_Executive_Audit.pdf`), file size (`2.4 MB`), author name, and upload date.
