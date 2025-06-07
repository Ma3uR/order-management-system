# Scripts Directory

This directory contains utility scripts for the order management system.

## Marketplace Status Sync Script

### Overview
The `marketplaces-status-sync.ts` script fetches all status options from the three supported marketplaces (Epicentr, Prom.ua, and Rozetka) and synchronizes them with the local database.

### Features
- ✅ Fetches statuses from all three marketplaces in parallel
- ✅ Creates new statuses or updates existing ones
- ✅ Assigns appropriate colors and priorities
- ✅ Maps marketplace codes to local database records
- ✅ Logs sync results and creates sync records
- ✅ Handles errors gracefully

### Usage

#### Programmatic Usage
```typescript
import { syncAllMarketplaceStatuses } from './scripts/marketplaces-status-sync';

const result = await syncAllMarketplaceStatuses();
console.log('Sync result:', result);
```

#### Individual Marketplace Sync
```typescript
import { 
  syncEpicentrStatuses, 
  syncPromStatuses, 
  syncRozetkaStatuses 
} from './scripts/marketplaces-status-sync';

// Sync only Epicentr statuses
const epicentrResult = await syncEpicentrStatuses();

// Sync only Prom.ua statuses  
const promResult = await syncPromStatuses();

// Sync only Rozetka statuses
const rozetkaResult = await syncRozetkaStatuses();
```

#### Terminal Usage
```bash
# Run the script directly
npx tsx scripts/marketplaces-status-sync.ts

# Or with Node.js
node -r ts-node/register scripts/marketplaces-status-sync.ts
```

### Database Schema
The script creates/updates records in the `status_options` collection with the following structure:
- `name`: Status name from the marketplace
- `color`: Auto-assigned color from predefined palette
- `priority`: Auto-assigned priority based on order
- `marketplace_code`: Original status ID from the marketplace
- `source`: Source marketplace ID (Epicentr/Prom.ua/Rozetka)

### Source Mappings
- **Epicentr**: `pj9sejm9vqtu8xq`
- **Prom.ua**: `gfzk8nxfokgu9ku`  
- **Rozetka**: `4tvf116a5aitwmb`

### Return Format
```typescript
{
  success: boolean;
  results: {
    epicentr: { synced: number; failed: number };
    promUa: { synced: number; failed: number };
    rozetka: { synced: number; failed: number };
  };
  totalSynced: number;
  totalFailed: number;
  error?: string;
}
```

### Error Handling
- Each marketplace sync is independent - if one fails, others continue
- Individual status sync failures are logged but don't stop the process
- Detailed error messages are provided for troubleshooting
- Sync records are created in the database for audit purposes

### Prerequisites
- Valid API tokens for all marketplaces must be set in environment variables
- PocketBase database connection must be configured
- Proper authentication credentials must be available 