---
name: breadcrumb
description: Basecoat UI Breadcrumb component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Breadcrumb (`breadcrumb`)

## Overview & Intent
Hierarchical navigation trail indicating current page location within application structure.

## Anatomy & DOM Structure
```html
<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol class="flex items-center gap-1.5 text-sm text-muted-foreground">
    <li><a href="/" class="hover:text-foreground">Home</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li><span aria-current="page" class="font-medium text-foreground">Settings</span></li>
  </ol>
</nav>
```

## Variants & Modifiers
Default slash separator, chevron separator.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | a class="hover:text-foreground" | Ancestor link |
| current | span aria-current="page" | Current leaf location |

## `data-icon` Placement
data-icon="inline-start" on home icon.

## Correct HTML Example
```html
<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol class="flex items-center gap-1.5 text-sm text-muted-foreground">
    <li><a href="/workspace" class="hover:text-foreground">Workspace</a></li>
    <li role="presentation" aria-hidden="true">›</li>
    <li><span aria-current="page" class="font-medium text-foreground">Billing</span></li>
  </ol>
</nav>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Flat div links without <nav>, <ol>, or aria-current="page" -->
<div class="flex gap-2 text-sm text-gray-500">
  <a href="/">Home</a> / <span>Settings</span>
</div>
```
