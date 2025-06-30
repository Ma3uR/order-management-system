# Source Display Relocation Feature

## Overview

This feature addresses the UI/UX improvement needed in the order management system where the source dropdown should only be editable during order creation, not when viewing/editing existing orders.

## Problem Statement

Currently, the source dropdown appears in two places:
1. **Order Creation Modal** (`OrderCreate.tsx`) - Correctly editable during creation
2. **Order Details Modal** (`order-details-modal.tsx`) - Unnecessarily editable when viewing/editing existing orders

The source field should be read-only after order creation to prevent accidental changes and provide cleaner UI.

## Current State Analysis

### Order Details Modal (`order-details-modal.tsx`)
- **Location**: Lines 684-708 in "Order Information" section
- **Component**: Full Select dropdown with editing capabilities
- **Issue**: Allows modification of source after order creation

### Order Create Modal (`OrderCreate.tsx`)
- **Location**: Lines 172-192 
- **Component**: Select dropdown for source selection
- **Status**: ✅ Correct - should remain editable during creation

### Dialog Header Structure (Lines 529-562)
Currently contains:
- Order title (`Order #{order.orderNumber}`)
- Copy Details button
- Status badge (colored)
- Creation date

## Proposed Solution

### 1. Remove Source Dropdown from Modal Body
- **Target**: Lines 684-708 in `order-details-modal.tsx`
- **Action**: Delete entire source Select component section
- **Result**: Cleaner "Order Information" section

### 2. Add Source Badge to Dialog Header
- **Location**: Dialog header section (around line 545)
- **Implementation**: 
  - Use existing `getSourceColor()` function for consistent styling
  - Find source name using: `sources.find(s => s.id === order.source)?.name`
  - Position near order title for immediate identification
  - Use existing Badge component pattern

### 3. Maintain Create Modal Unchanged
- **File**: `OrderCreate.tsx`
- **Action**: No changes required
- **Reason**: Source selection is correctly placed during order creation

## Technical Implementation Details

### Components Involved
- `order-details-modal.tsx` - Main changes
- `OrderCreate.tsx` - No changes needed

### Code Patterns to Follow
```tsx
// Use existing getSourceColor function
const sourceColor = getSourceColor(order.source)

// Find source name from sources array  
const sourceName = sources.find(s => s.id === order.source)?.name

// Badge pattern (similar to existing status badge)
<Badge 
  className="text-white text-xs"
  style={{
    backgroundColor: sourceColor,
    borderColor: sourceColor
  }}
>
  {sourceName}
</Badge>
```

### Header Layout Adjustments
- Position source badge logically with other header elements
- Maintain responsive design principles
- Ensure proper spacing with existing elements (title, copy button, status, date)

## Files to Modify

1. **`/app/components/features/orders/components/dashboard/order-details-modal.tsx`**
   - Remove lines 684-708 (source Select component)
   - Add source badge to header section around line 545

## Benefits

1. **Cleaner Interface**: Removes unnecessary editable field from details modal
2. **Immediate Identification**: Source immediately visible in header
3. **Prevent Accidents**: No accidental source changes after creation
4. **Consistent Pattern**: Follows existing header badge pattern (status badge)
5. **Logical Separation**: Editable during creation, read-only during viewing/editing

## UI/UX Improvements

- **Before**: Source buried in modal body as editable dropdown
- **After**: Source prominently displayed in header as colored badge
- **Consistency**: Aligns with status badge pattern already established
- **Usability**: Reduces cognitive load by showing source at first glance

## Implementation Steps

1. ✅ Document feature requirements (this file)
2. ⏳ Remove source dropdown from modal body
3. ⏳ Add source badge to dialog header
4. ⏳ Test functionality and UI layout
5. ⏳ Verify create modal remains unchanged

## Testing Considerations

### Functionality Tests
- Verify source badge displays correctly in header
- Confirm source dropdown removed from body
- Ensure create modal source dropdown still works
- Test with all source types (Rozetka, Epicentr, Prom.ua)

### UI/Layout Tests
- Check header layout on different screen sizes
- Verify badge colors match existing `getSourceColor()` function
- Ensure proper spacing with other header elements
- Test with long source names

## Future Considerations

This pattern could be extended to other fields that should be read-only after creation, such as:
- Order creation date
- Initial marketplace data
- Other immutable order properties

## Related Files Reference

- `order-details-modal.tsx` - Main implementation file
- `OrderCreate.tsx` - Reference for source dropdown pattern
- Existing `getSourceColor()` function - For color consistency
- Badge component usage - For styling pattern