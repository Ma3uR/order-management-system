# Kanban Board Feature

## Overview

The Kanban Board feature transforms the traditional table-based order management view into a visual, drag-and-drop workflow system. This feature leverages the existing order status system to create dynamic columns where orders can be visually managed and moved between different stages.

## Architecture

### Technology Stack
- **Drag & Drop**: Uses existing `@dnd-kit` libraries already included in the project
- **UI Components**: Built with Radix UI components and Tailwind CSS
- **State Management**: Integrates with existing PocketBase real-time subscriptions
- **TypeScript**: Fully typed with custom interfaces for Kanban-specific data structures

### File Structure
```
app/components/features/kanban/
├── types.ts              # TypeScript interfaces for Kanban components
├── KanbanCard.tsx        # Individual order card component
├── KanbanColumn.tsx      # Status-based column component
├── KanbanBoard.tsx       # Main Kanban board with drag & drop logic
└── utils.ts              # Drag & drop handlers and utility functions
```

## Features

### Visual Order Management
- **Status Columns**: Each order status becomes a column on the Kanban board
- **Order Cards**: Individual orders are displayed as cards with key information
- **Drag & Drop**: Orders can be moved between status columns to update their status
- **Real-time Updates**: Changes are synchronized across all users via PocketBase subscriptions

### Card Information Display
Each Kanban card shows:
- Order number (clickable to copy)
- Customer name and phone number (clickable to copy)
- Order amount with currency formatting
- Product count and total items
- Creation date
- Source marketplace with color coding
- Quick action buttons (Details, Archive)
- Communication options (Call, Viber, Telegram)

### Integration with Existing Systems
- **Status Synchronization**: Leverages existing marketplace status sync functionality
- **Order Management**: Uses the same order update logic as the table view
- **Copy to Clipboard**: Maintains existing copy-to-clipboard functionality with visual feedback
- **Internationalization**: Supports existing i18n system
- **Real-time Subscriptions**: Extends current PocketBase real-time updates

## Use Cases

### 1. Order Status Management
Transform the dropdown-based status updates into a visual workflow:
- **New Orders**: Appear in the "New" column for immediate visibility
- **Processing**: Drag orders to "Processing" when work begins
- **Shipped**: Move to "Shipped" when orders are dispatched
- **Delivered**: Final column for completed orders

### 2. Marketplace Workflow
Organize orders by source marketplace:
- **Rozetka Orders**: Visual overview of Rozetka-specific orders
- **Epicentr Orders**: Dedicated view for Epicentr marketplace
- **Prom.ua Orders**: Separate workflow for Prom.ua orders

### 3. Production Pipeline
Track manufacturing and fulfillment stages:
- **Order Received**: Initial stage for new orders
- **In Production**: Orders being manufactured
- **Quality Check**: Post-production verification
- **Ready to Ship**: Prepared for dispatch
- **Shipped**: Orders in transit

### 4. Customer Service Workflow
Manage customer support and order issues:
- **New Issues**: Newly reported problems
- **In Progress**: Issues being actively resolved
- **Waiting for Customer**: Pending customer response
- **Resolved**: Completed customer service cases

## Technical Implementation

### Drag & Drop Logic
```typescript
// Utilizes @dnd-kit for smooth drag and drop
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
)

function handleDragEnd(event: DragEndEvent) {
  // Update order status via existing handleStatusChange function
  // Sync with marketplace APIs
  // Update local state and trigger real-time updates
}
```

### Status Column Generation
```typescript
// Dynamic column creation based on available statuses
const columns = statuses.map(status => ({
  id: status.id,
  title: status.name,
  color: status.color,
  orders: orders.filter(order => order.status === status.id)
}))
```

### Real-time Updates
The Kanban board extends the existing PocketBase subscription system:
- Orders moving between columns are updated in real-time
- New orders appear automatically in appropriate columns
- Status changes by other users are reflected immediately
- Visual notifications for external changes

## Integration Points

### Existing Systems
- **Orders Dashboard**: Toggle between table and Kanban views
- **Status Management**: Reuses existing status options and colors
- **Marketplace Sync**: Maintains existing marketplace status synchronization
- **Order Details Modal**: Same modal opens when clicking order cards
- **Archive Functionality**: Same archive behavior as table view

### API Integration
- **PocketBase**: Uses existing order collection and real-time subscriptions
- **Marketplace APIs**: Integrates with Rozetka, Epicentr, and Prom.ua status sync
- **Status Automation**: Maintains existing automated status transitions
- **Telegram Notifications**: Preserves existing notification system

## Benefits

### Improved Workflow Visibility
- **Visual Status Overview**: Immediate understanding of order distribution across statuses
- **Bottleneck Identification**: Easy identification of stages with too many orders
- **Progress Tracking**: Visual representation of order flow through the system

### Enhanced User Experience
- **Intuitive Interface**: Drag-and-drop is more intuitive than dropdown selections
- **Reduced Clicks**: Single drag action replaces multiple clicks
- **Better Organization**: Visual grouping makes order management more efficient

### Maintained Functionality
- **Feature Parity**: All existing functionality remains available
- **Data Integrity**: Same validation and sync mechanisms
- **Performance**: Leverages existing optimizations and caching

## Future Enhancements

### Advanced Filtering
- Filter cards within columns by source, date, amount
- Search functionality within the Kanban view
- Custom column configurations per user

### Analytics Integration
- Time-in-status tracking for performance metrics
- Column-based analytics and reporting
- Workflow optimization suggestions

### Workflow Customization
- Custom status workflows per marketplace
- User-defined column arrangements
- Automated status transitions with visual feedback

## Development Notes

### Dependencies
- No additional dependencies required - uses existing `@dnd-kit` packages
- Maintains existing UI component library (Radix UI + Tailwind)
- Compatible with current TypeScript and React versions

### Performance Considerations
- Efficient rendering with virtualization for large order sets
- Optimized drag operations with existing state management
- Minimal re-renders through proper memoization

### Accessibility
- Full keyboard navigation support via `@dnd-kit`
- Screen reader compatibility
- High contrast mode support
- Focus management during drag operations

This Kanban Board feature provides a modern, visual interface for order management while maintaining full compatibility with existing systems and workflows.