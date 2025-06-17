# Step-by-Step Guide: Getting Required Keys for Automation

This guide will walk you through obtaining all the necessary keys and IDs for the order automation system.

## 🤖 Part 1: Telegram Bot Setup

### Step 1: Create a Telegram Bot

1. **Open Telegram** on your phone or computer
2. **Search for BotFather**: Type `@BotFather` in the search bar
3. **Start conversation**: Click on BotFather and press "Start"
4. **Create new bot**: Send the command `/newbot`
5. **Choose bot name**: 
   - BotFather will ask for a name (e.g., "Order Management Bot")
   - This is the display name users will see
6. **Choose username**: 
   - Must end with "bot" (e.g., "your_company_orders_bot")
   - Must be unique across all Telegram
7. **Save the token**: BotFather will send you a message like:
   ```
   Congratulations! You have created a new bot.
   Use this token to access the HTTP API:
   1234567890:ABCdefGhIjKlMnOpQrStUvWxYz123456
   ```
   - **Copy this token** - this is your `TELEGRAM_BOT_TOKEN`

### Step 2: Get Your Chat ID

#### Option A: Personal Chat (Send to yourself)
1. **Start chat with your bot**: Click the link BotFather provided or search for your bot
2. **Send any message** to your bot (e.g., "Hello")
3. **Get updates**: Open this URL in your browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   Replace `<YOUR_BOT_TOKEN>` with the token from Step 1
4. **Find chat ID**: Look for something like:
   ```json
   {
     "update_id": 123456789,
     "message": {
       "message_id": 1,
       "from": {...},
       "chat": {
         "id": 987654321,
         "first_name": "Your Name",
         "type": "private"
       },
       "text": "Hello"
     }
   }
   ```
   - The `chat.id` (987654321) is your `TELEGRAM_CHAT_ID`

#### Option B: Group Chat
1. **Create a group** or use existing group
2. **Add your bot** to the group:
   - Go to group settings → Add Members → Search for your bot
3. **Send a message** in the group that mentions your bot:
   ```
   Hello @your_bot_name
   ```
4. **Get updates**: Visit the same URL as above
5. **Find group chat ID**: Look for a **negative number** like:
   ```json
   "chat": {
     "id": -1001234567890,
     "title": "Your Group Name",
     "type": "group"
   }
   ```
   - The negative `chat.id` (-1001234567890) is your `TELEGRAM_CHAT_ID`

#### Option C: Channel
1. **Create a channel** or use existing channel
2. **Add your bot** as administrator:
   - Channel settings → Administrators → Add Administrator → Search for your bot
   - Give it permission to "Post Messages"
3. **Post a message** in the channel
4. **Get updates**: Visit the getUpdates URL
5. **Find channel ID**: Look for:
   ```json
   "chat": {
     "id": -1001234567890,
     "title": "Your Channel",
     "type": "channel"
   }
   ```

### Step 3: Test Your Bot Setup

1. **Test sending a message** using this URL:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=Test message
   ```
2. **Check if message appears** in your chat/group/channel
3. **If successful**: You'll see JSON response with `"ok": true`

---

## 🏪 Part 2: Rozetka Processing Status Code

### Step 1: Access Rozetka Seller API

1. **Login to Rozetka Seller account**: Go to your seller dashboard
2. **Get API access**: Contact Rozetka support to enable API access if not already available
3. **Get your credentials**: You should have:
   - `ROZETKA_USERNAME` (your seller login)
   - `ROZETKA_PASSWORD` (your seller password)

### Step 2: Find Available Status Codes

#### Method A: Using API directly
1. **Test your API access** by calling the status endpoint:
   ```bash
   curl -X POST "https://api-seller.rozetka.com.ua/sites" \
   -H "Content-Type: application/json" \
   -d '{
     "username": "your_username",
     "password": "base64_encoded_password"
   }'
   ```
2. **Get access token** from the response
3. **Get order statuses**:
   ```bash
   curl -X GET "https://api-seller.rozetka.com.ua/order-statuses/search" \
   -H "Authorization: Bearer your_access_token" \
   -H "Content-Type: application/json"
   ```

#### Method B: Using our system
1. **Set up basic environment** variables in `.env`:
   ```bash
   ROZETKA_USERNAME=your_username
   ROZETKA_PASSWORD=your_password
   ```
2. **Create a test script** to fetch statuses:
   ```javascript
   // test-rozetka-statuses.js
   const { getOrderStatuses } = require('./app/actions/rozetka');
   
   async function getStatuses() {
     try {
       const result = await getOrderStatuses();
       if (result.error) {
         console.error('Error:', result.error);
       } else {
         console.log('Available statuses:');
         result.data.forEach(status => {
           console.log(`- ID: ${status.status}, Name: ${status.name_uk}, Name EN: ${status.name}`);
         });
       }
     } catch (error) {
       console.error('Failed:', error);
     }
   }
   
   getStatuses();
   ```
3. **Run the script**:
   ```bash
   node test-rozetka-statuses.js
   ```

### Step 3: Identify Processing Status

Look for statuses like:
- **Ukrainian**: "Обробляється менеджером", "В обробці", "Прийнято в обробку"
- **English**: "Processing", "Being processed", "In processing", "Accepted for processing"
- **Status codes**: Usually numbers like `2`, `3`, `4` etc.

Example output:
```
Available statuses:
- ID: 1, Name: Новий, Name EN: New
- ID: 2, Name: Обробляється менеджером, Name EN: Processing  ← This one!
- ID: 3, Name: Підтверджено, Name EN: Confirmed
- ID: 4, Name: Відправлено, Name EN: Shipped
```

**Save the ID number** (e.g., `2`) as your `ROZETKA_PROCESSING_STATUS_CODE`

---

## 🗄️ Part 3: Database Status ID

### Step 1: Check Your Database

1. **Access your PocketBase admin panel**: Usually `http://localhost:8090/_/`
2. **Login** with your admin credentials
3. **Go to Collections** → **status_options**
4. **Look for the processing status**:
   - Find entry with name like "Обрабатывается менеджером"
   - Note down the **ID** (should be `zrebd3ngst3qnu4` according to your requirements)

### Step 2: Verify Status Mapping

1. **Check the mapping** between Rozetka and your system:
   - `source` should be `4tvf116a5aitwmb` (Rozetka source ID)
   - `marketplace_code` should match your Rozetka processing status code
   - `id` should be `zrebd3ngst3qnu4`

2. **If mapping doesn't exist**, create it:
   ```sql
   INSERT INTO status_options (
     id, 
     name, 
     source, 
     marketplace_code, 
     priority, 
     isDefault
   ) VALUES (
     'zrebd3ngst3qnu4',
     'Обрабатывается менеджером',
     '4tvf116a5aitwmb',
     'YOUR_ROZETKA_STATUS_CODE',
     2,
     false
   );
   ```

---

## 📝 Part 4: Final Configuration

### Step 1: Update .env File

Add all the keys to your `.env` file:

```bash
# Automation Features
ENABLE_STATUS_AUTOMATION=true
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIjKlMnOpQrStUvWxYz123456
TELEGRAM_CHAT_ID=987654321
ROZETKA_PROCESSING_STATUS_CODE=2

# Existing Rozetka credentials
ROZETKA_USERNAME=your_username
ROZETKA_PASSWORD=your_password
```

### Step 2: Test Configuration

1. **Run the test script**:
   ```bash
   node test-automation.js
   ```

2. **Expected output**:
   ```
   🧪 Testing Automation Configuration...
   
   📊 Automation Configuration:
     ✅ Enabled: true
     🔑 Has Status Code: true
     📝 Status Code: 2
   
   📱 Telegram Configuration:
     ✅ Enabled: true
   
   📋 Configuration Summary:
     🎉 All systems ready for automation!
   ```

### Step 3: Test End-to-End

1. **Run order sync** to test automation:
   ```bash
   npm run sync:orders
   ```

2. **Check the output** for automation results:
   ```
   🤖 Automation Results:
      🔄 Status Changes: 1
      📱 Telegram Sent: 1
      ⚠️  Automation Errors: 0
   ```

---

## 🚨 Troubleshooting

### Telegram Issues

**Bot token invalid**:
- Double-check token from BotFather
- Make sure no extra spaces or characters

**Chat ID not working**:
- Try negative numbers for groups/channels
- Use `getUpdates` URL to find correct ID
- Ensure bot has permission to send messages

**403 Forbidden error**:
- Bot was blocked by user
- Bot removed from group/channel
- Bot doesn't have send message permissions

### Rozetka Issues

**Authentication failed**:
- Check username/password
- Verify API access is enabled
- Password might need base64 encoding

**Status code not working**:
- Verify status exists in Rozetka
- Check if status transition is allowed
- Ensure you have permission to change statuses

### Database Issues

**Status ID not found**:
- Check PocketBase admin panel
- Verify status_options collection
- Create missing status entries

**Mapping incorrect**:
- Verify source ID matches Rozetka
- Check marketplace_code matches API
- Ensure proper permissions

---

## 📞 Getting Help

If you encounter issues:

1. **Check logs** for detailed error messages
2. **Run test scripts** to isolate problems
3. **Verify each step** independently
4. **Test API calls** manually first

Remember: Test each component separately before combining them all together!