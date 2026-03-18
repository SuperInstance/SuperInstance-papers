# Quick Start Guide - Minimal CLAW Server MVP

**Get the demo running in under 5 minutes!**

---

## Prerequisites

- Node.js installed (v18 or higher)
- Modern web browser (Chrome, Firefox, Edge)
- Terminal/Command Prompt

---

## Step 1: Install Dependencies (1 minute)

```bash
cd C:\Users\casey\polln\minimal-claw-server
npm install
```

Expected output:
```
added 86 packages, and audited 87 packages in 3s
```

---

## Step 2: Start Server (10 seconds)

```bash
npm start
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║           MINIMAL CLAW SERVER - MVP DEMONSTRATION          ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: 8080                                                ║
║  Health: http://localhost:8080/health                      ║
║  Agents: 0                                                 ║
╚════════════════════════════════════════════════════════════╝
```

**Keep this terminal open!**

---

## Step 3: Open Demo (10 seconds)

1. Open File Explorer
2. Navigate to: `C:\Users\casey\polln\minimal-claw-server\`
3. Double-click `demo.html`
4. Or right-click → Open with → Chrome

---

## Step 4: Create Your First Agent (30 seconds)

1. **Click cell A1** in the spreadsheet grid
2. **Click "Create Agent"** button
3. **Watch the magic happen!**

You should see:
- ✅ Green dot appear in cell A1 (agent indicator)
- ✅ Agent appear in "Active Agents" list
- ✅ Success message: "Agent created successfully!"

---

## Step 5: Trigger the Agent (30 seconds)

1. **Click cell A1** again (if not selected)
2. **Click "Trigger Agent"** button
3. **Watch the state changes:**

   - IDLE (green)
   - THINKING (yellow) - 1 second
   - ACTING (blue) - 1 second
   - IDLE (green) - back to start

---

## Step 6: Create More Agents (1 minute)

1. **Click cell B2**
2. **Change the seed text** to something different
3. **Click "Create Agent"**
4. **Click cell C3**
5. **Select different equipment** (hold Ctrl to select multiple)
6. **Click "Create Agent"**

Now you have 3 agents in different cells!

---

## Step 7: Delete an Agent (20 seconds)

1. **Click cell A1**
2. **Click "Delete Agent"**
3. **Agent is gone!**

---

## Troubleshooting

### Server won't start

**Problem:** Port 8080 already in use

**Solution:**
```bash
# Kill process on port 8080 (Windows)
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Or use different port
set PORT=8081
npm start
```

### Demo won't open

**Problem:** File association

**Solution:**
1. Open Chrome/Firefox manually
2. Press Ctrl+O
3. Navigate to: `C:\Users\casey\polln\minimal-claw-server\demo.html`
4. Open file

### "Server Disconnected" in demo

**Problem:** Server not running

**Solution:**
1. Check terminal where server is running
2. If stopped, run `npm start` again
3. Wait for "Server is Running" message

### Agent creation fails

**Problem:** Cell not selected

**Solution:**
1. Make sure you clicked a cell first
2. Cell should be highlighted in purple
3. "Selected Cell" field should show cell address (e.g., "A1")

---

## Testing with curl (Optional)

Open a new terminal and try these commands:

```bash
# Health check
curl http://localhost:8080/health

# Create agent
curl -X POST http://localhost:8080/api/v1/agents ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"deepseek-chat\",\"seed\":\"Test agent\",\"equipment\":[\"MEMORY\"],\"cellId\":{\"sheetId\":\"sheet1\",\"row\":0,\"col\":0}}"

# List agents
curl http://localhost:8080/api/v1/agents

# Get agent by cell
curl http://localhost:8080/api/v1/cells/sheet1/0/0/agent
```

---

## What You Should See

### Server Terminal
```
Minimal CLAW Server running on http://localhost:8080
WebSocket server listening on ws://localhost:8080/ws
```

### Demo Browser
- Beautiful purple gradient header
- 4x4 spreadsheet grid
- Agent creation controls on the right
- Active agents list at the bottom
- Green dots in cells with agents
- Real-time state updates

### Agent States
- **IDLE** (green) - Waiting for trigger
- **THINKING** (yellow) - Processing
- **ACTING** (blue) - Taking action
- **ERROR** (red) - Something went wrong

---

## Success Indicators

✅ Server starts without errors
✅ Demo page loads in browser
✅ You can click cells
✅ You can create agents
✅ Agents show up in the list
✅ Triggering changes agent state
✅ Server status shows "Connected"

---

## Next Steps

Once you have the demo working:

1. **Read the full documentation:** `MVP_COMPLETION_REPORT.md`
2. **Explore the API:** Try all endpoints with curl
3. **Customize agents:** Change seeds and equipment
4. **Watch the real-time updates:** Open demo in 2 browsers!

---

## Need Help?

1. Check server terminal for error messages
2. Open browser DevTools (F12) for console errors
3. Read `MVP_COMPLETION_REPORT.md` for known issues
4. Check `README.md` for API documentation

---

**Enjoy the demo! 🦊**

This is a minimal working MVP demonstrating cellular agents living in spreadsheet cells. The concept works and is ready for further development!
