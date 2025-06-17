# Order Status Automation & Telegram Notifications

This document describes how to set up and configure the automated status change and Telegram notification system for Rozetka orders.

## Overview

The automation system automatically:
1. Detects new orders with "New"/"Новий"/"Новый" status
2. Changes their status to "Обрабатывается менеджером" (Processing)
3. Sends Telegram notifications to customers with order details

## Setup

### 1. Environment Variables

Add the following variables to your `.env` file:

```bash
# Enable/disable automation
ENABLE_STATUS_AUTOMATION=true

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Rozetka Status Code for "Processing"
ROZETKA_PROCESSING_STATUS_CODE=your_status_code_here
```

### 2. Telegram Bot Setup

1. **Create a Telegram Bot:**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Send `/newbot` and follow instructions
   - Save the bot token from BotFather

2. **Get Chat ID:**
   - Add your bot to the target chat/channel
   - Send a message to the bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the `chat.id` from the response

3. **Set Environment Variables:**
   ```bash
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIjKlMnOpQrStUvWxYz
   TELEGRAM_CHAT_ID=-1001234567890
   ```

### 3. Rozetka Status Code

1. **Find Processing Status Code:**
   - Use Rozetka API to get available statuses
   - Find the status code for "Processing" or similar
   - Add to environment variables

2. **Database Status Mapping:**
   - Ensure status ID `zrebd3ngst3qnu4` exists in your `status_options` table
   - This should map to "Обрабатывается менеджером"

## Message Format

Telegram messages are sent in Ukrainian using this template:

```
№853973600

Дніпро, (ЖК River Park), Набережна Перемоги, 42Ф

ROZETKA Delivery

099 344 30 91

Гнілицька Анастасія Олександрівна

Добриво для авокадо, 1 літр 2 шт

Разом: 236 ₴
```

## Configuration

### Enable/Disable Automation

```bash
# Enable automation
ENABLE_STATUS_AUTOMATION=true

# Disable automation (default)
ENABLE_STATUS_AUTOMATION=false
```

### Status Detection

The system detects these status variants as "New":
- `New`, `new`, `NEW`
- `Новий`, `новий`, `НОВИЙ`
- `Новый`, `новый`, `НОВЫЙ`

## Monitoring

### Sync Script Output

The orders sync script shows automation results:

```
✅ Rozetka sync completed in 2.5s:
   📥 Synced: 5 orders
   ❌ Failed: 0 orders
   🤖 Automation Results:
      🔄 Status Changes: 2
      📱 Telegram Sent: 2
      ⚠️  Automation Errors: 0
```

### Database Logging

Automation events are logged in the `sync_records` table:
- `automation_status_changes`: Number of automated status changes
- `automation_telegram_sent`: Number of Telegram notifications sent
- `automation_errors`: Number of automation failures

## Error Handling

### Graceful Failures
- Automation failures don't break the sync process
- Orders are still synced even if automation fails
- Detailed error logging for debugging

### Common Issues

1. **Telegram Notifications Failing:**
   - Check bot token and chat ID
   - Verify bot has permission to send messages
   - Check network connectivity

2. **Status Changes Failing:**
   - Verify Rozetka API credentials
   - Check processing status code
   - Ensure database status ID exists

3. **Automation Disabled:**
   - Check `ENABLE_STATUS_AUTOMATION=true`
   - Verify all required environment variables

## Testing

### Test Telegram Connection

You can test the Telegram configuration by calling the test function:

```typescript
import { testTelegramConnection } from '@/app/lib/services/telegram';

const result = await testTelegramConnection();
console.log(result);
```

### Test Automation

The automation runs automatically during the orders sync process:

```bash
npm run sync:orders
```

## Architecture

### Extensible Design

The system is designed to support other marketplaces in the future:

- **Telegram Service**: Marketplace-agnostic
- **Status Automation**: Interface-based design
- **Configuration**: Environment-based setup

### Future Marketplaces

To add Prom.ua or Epicentr support:

1. Implement marketplace-specific status automation
2. Add marketplace-specific environment variables
3. Integrate with existing sync processes

## Security

### Environment Variables
- Never commit tokens to version control
- Use secure environment variable management in production
- Rotate tokens periodically

### Telegram Security
- Use bot tokens, not user tokens
- Restrict bot permissions to minimum required
- Monitor bot usage for suspicious activity