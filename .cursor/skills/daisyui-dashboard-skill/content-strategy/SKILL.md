---
name: content-strategy
description: Master router for generic data modeling, entity structures, and realistic UI content generation.
---

# Content Strategy & Realistic Mock Data

## GUARDRAILS
* **No Lazy Placeholders:** It is FORBIDDEN to use "Lorem Ipsum", "Test 1", or repetitive filler text. You must always generate realistic, domain-appropriate mock copy and data.

## ENTITY DATA MODELING RULES

When generating mock data for your components, you MUST adhere strictly to the following structural shapes to maintain realism and professional quality:

### 1. PEOPLE & ACCOUNTS
* **Identity:** Always include a realistic Full Name, an Avatar or generated Initials, and a recognizable System ID (e.g., `USR-8921`).
* **Contact & State:** Provide a professional Email address, an Access Level (e.g., `Admin`, `Editor`), a Status Badge (e.g., `Active`, `Invited`), and temporal data (e.g., `Last Active 2h ago`).

### 2. OBJECTS & INVENTORY
* **Identification:** Include a clear Title, a representative Thumbnail or Icon, and a formatted Alphanumeric ID (e.g., `ITM-402-B`).
* **Classification & State:** Assign a Category, relevant Metadata Tags, a Core Metric (such as Price or Stock level), and an Availability Badge (e.g., `In Transit`, `Low Stock`).

### 3. TRANSACTIONS & LEDGERS
* **Data Completeness:** Generate an exact Transaction ID (e.g., `TXN-9982-A`), precise monetary values (e.g., `$1,240.00`), Counterparty details (e.g., `Visa *4242`), a semantic clearing state (e.g., `Paid`, `Failed`), and an exact timestamp.

### 4. TASKS, EVENTS, & DOCUMENTS
* **Tasks:** Use action-oriented titles, distinct Issue Keys (e.g., `ENG-142`), an Assignee, a Pipeline Status, a Priority Level, and a Due Date.
* **Events & Logs:** Display exact timestamps (using `font-mono`), a Severity badge, the Actor, a clear Verb-Noun action string (e.g., `user.login`, `db.sync`), and muted metadata for context.
* **Documents:** Show a corresponding file type icon, a realistic filename complete with extension (e.g., `Q3_Report.pdf`), an accurate file size (e.g., `1.4 MB`), the Origin, and an Upload Date.
