# Audit Log UX/UI Recommendations

## Overview
This document outlines the recommended UX/UI approach for displaying audit logs throughout the application.

## 1. Entity-Level Activity Timeline (Enhanced)

### Location
- Supplier Details Page → Activity Tab
- Contract Details Page → Activity Tab
- Any detail page showing entity history

### Design Pattern
**Vertical Timeline** with:
- Color-coded action badges (create=green, update=blue, delete=red, etc.)
- User avatar/name for each action
- Relative timestamps ("2 hours ago") + absolute ("Dec 15, 2024 14:30")
- Expandable details showing field-level changes
- Visual timeline connector line

### Component
Use `ActivityTimeline` component from `components/audit/activity-timeline.tsx`

### Features
- ✅ Shows all audit logs for the specific entity
- ✅ Grouped by date (optional)
- ✅ Expandable "View Details" to see full diff
- ✅ Shows who made the change
- ✅ Highlights what fields changed for updates

---

## 2. Global Audit Log Page

### Location
`/audit-logs` (new page for admins/auditors)

### Design Pattern
**Data Table** using `DataTable08` component with:
- Full search and filtering capabilities
- Group by entity type, user, action, date range
- Export to CSV/Excel
- Pagination
- Column visibility toggle

### Columns
1. **Timestamp** - Sortable, formatted
2. **User** - Avatar + name/email
3. **Action** - Badge with icon (create, update, delete, etc.)
4. **Entity Type** - Badge (supplier, contract, etc.)
5. **Entity** - Link to detail page
6. **Changes** - Summary of fields changed
7. **Details** - Expandable row to see full diff
8. **IP Address** - For security auditing (admin-only)

### Filters
- Date Range (start/end date)
- User (dropdown)
- Action (multi-select)
- Entity Type (multi-select)
- Search (full-text on entity name/description)

---

## 3. Dashboard Widget

### Location
Dashboard or sidebar widget for recent activity

### Design Pattern
**Compact Feed** showing:
- Last 5-10 most recent actions
- Simplified view (icon, action, entity, time)
- "View All" link to full audit log page

---

## 4. Notification Badge

### Location
Activity tabs on detail pages

### Design Pattern
- Show count of unread/recent changes
- Badge on tab: "Activity (5)"
- Highlights recent activity within last 24 hours

---

## 5. Real-Time Updates (Optional - Future)

### Pattern
- WebSocket/Server-Sent Events for live updates
- Show "New activity" indicator
- Auto-refresh activity timeline when on detail page

---

## Implementation Priority

### Phase 1 (Current) ✅
- [x] Activity Timeline component with real audit data
- [x] Server action to fetch audit logs
- [ ] Update supplier details page Activity tab to use real logs

### Phase 2 (Next)
- [ ] Global Audit Log page (`/audit-logs`)
- [ ] Filtering and search functionality
- [ ] Export functionality

### Phase 3 (Future)
- [ ] Dashboard activity widget
- [ ] Real-time updates
- [ ] Advanced diff viewer with side-by-side comparison
- [ ] Bulk export with date ranges

---

## UI/UX Best Practices

1. **Visual Hierarchy**
   - Use color coding for action types
   - Icons for quick scanning
   - Typography scale (headers, body, timestamps)

2. **Progressive Disclosure**
   - Show summary by default
   - Expandable details for full information
   - "View All Changes" for updates with many fields

3. **Contextual Information**
   - Always show who, what, when
   - Link to related entities
   - Show user role/permissions if relevant

4. **Performance**
   - Paginate large result sets
   - Lazy load expandable details
   - Cache recent queries

5. **Accessibility**
   - Screen reader friendly
   - Keyboard navigation
   - Clear labels and ARIA attributes

