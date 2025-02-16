# Order Merging System

## Overview
Automated order merging system that detects potential duplicate orders based on customer information and allows manual confirmation/resolution of conflicts.

### Key Features
- Phone number matching (priority)
- Customer name matching
- Conflict resolution interface
- Audit trail of merged orders
- Marketplace status synchronization

## Workflow
1. **Detection** (Every 5 minutes & on new order creation)
   - Scan unprocessed orders with lowest priority status
   - Group by phone number → name → delivery method
   - Flag groups with 2+ orders as potential merges

2. **User Confirmation**
   - Show merge notification with match details
   - Options: Confirm merge or Reject suggestion

3. **Conflict Resolution**
   - Compare conflicting fields:
     - Delivery methods
     - Payment methods
     - Customer notes
     - Phone numbers
   - Manual selection of preferred values

4. **Merging Execution**
   - Create new merged order
   - Archive original orders
   - Update all linked marketplace statuses

## Detection Criteria
| Priority | Field          | Matching Logic                |
|----------|----------------|--------------------------------|
| 1        | Phone Number   | Exact match (normalized)       |
| 2        | Full Name      | Levenshtein distance < 2       |

## Conflict Resolution Options
1. **Automatic**
   - Most recent value
   - Highest value (for amounts)
   - Longest text (for notes)

2. **Manual**
   - Dropdown selection per conflicted field
   - Custom value input
   - Bulk apply selections

## Order Merging Process Flow

1. **Detection Phase** (Every 5 minutes + new orders)
   - Targets: Unprocessed orders with lowest priority status
   - Matching Priorities:
     1. Phone Numbers: Exact match after normalization
     2. Customer Names: Similar names (Levenshtein distance < 2)

2. **User Interaction**
   - Notification shows match type (phone/name) and order count
   - Options:
     - Confirm Merge - Opens conflict resolution
     - Reject Suggestion - Marks as non-mergeable

3. **Conflict Resolution**
   - Automatic Resolution:
     - Most recent values for timestamps
     - Highest monetary amounts
     - Longest text entries
   - Manual Overrides:
     - Dropdown per conflicting field
     - Custom value inputs
     - Bulk apply selections

4. **Merge Execution**
   - Creates new order with:
     - Combined marketplace IDs
     - Summed item counts/amounts
     - Merged product lists
     - Conflict resolutions
   - Archives original orders
   - Synchronizes status across all linked marketplace orders

## Key Preservation
- Audit trail of original orders
- Marketplace status consistency
- Customer information integrity

The system prioritizes preventing accidental merges while ensuring accurate order consolidation when needed.
