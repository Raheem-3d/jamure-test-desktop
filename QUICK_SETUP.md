# 🚀 Quick AI Features Setup - 5 Minutes!

## ✅ Step 1: Add Perplexity API Key (2 minutes)

### Get Your API Key
1. Visit: https://www.perplexity.ai/settings/api
2. Sign up or login
3. Click "Generate API Key"
4. Copy the key (starts with `pplx-`)

### Add to .env File
```bash
# Open your .env file and add:
PERPLEXITY_API_KEY=pplx-your-key-here
```

**Location:** Root folder me `.env` file

---

## ✅ Step 2: Restart Server (1 minute)

```bash
# Terminal me:
# Stop current server (Ctrl+C)
# Then restart:
pnpm dev
```

---

## ✅ Step 3: Test AI Features (2 minutes)

### Test 1: AI Assistant
1. Sidebar me **"AI Assistant"** link dekho (Bot icon ke saath)
2. Click karo
3. Type karo: "What tasks are overdue?"
4. AI response dekho!

### Test 2: Message Summarization
1. Kisi bhi channel me jao
2. Channel header me **"AI Summary"** button dekho (Sparkles icon)
3. Click karo
4. Last 50 messages ka summary dekho!

---

## 🎯 Where to Find AI Features

### 1. **Sidebar Navigation**
- ✨ **AI Assistant** (2nd item from top)
  - Bot icon ke saath
  - Yellow sparkles badge

### 2. **Channel Headers**
- ✨ **AI Summary** button
  - Har channel ke top-right me
  - Members button ke paas

### 3. **Coming Soon** (Ready to enable)
- Smart Reply Suggestions (Message input me)
- Task Breakdown (Task detail me)
- Sentiment Analysis (Admin dashboard me)

---

## 🐛 Troubleshooting

### "AI Summary" button nahi dikh raha?
**Fix:** Server restart karo
```bash
# Terminal me Ctrl+C press karo
# Phir:
pnpm dev
```

### "AI Assistant" page 404 error?
**Fix:** Check karo file exist karti hai:
- `app/dashboard/ai-assistant/page.tsx`

### API Error: "Unauthorized" or "API key not found"
**Fix:** 
1. `.env` file check karo
2. `PERPLEXITY_API_KEY=` line exist karti hai?
3. Server restart kiya?

### Hook Error in messages?
**Fix:** Already fixed! If still seeing:
```bash
# Clear cache and restart:
pnpm clean
pnpm dev
```

---

## 💡 Quick Test Commands

### Test API Route Manually
```bash
# In browser console or Postman:
POST http://localhost:3000/api/ai/assistant
{
  "query": "What are my tasks?"
}
```

### Check Environment Variable
```bash
# In terminal:
echo $PERPLEXITY_API_KEY
# Should show: pplx-xxxxx
```

---

## 📊 Expected Results

### After Setup, You Should See:

1. **Sidebar:**
   - ✅ "AI Assistant" link with Bot icon
   - ✅ Yellow sparkles badge

2. **Channel Header:**
   - ✅ "AI Summary" button
   - ✅ Working summarization on click

3. **AI Assistant Page:**
   - ✅ Chat interface
   - ✅ Sample queries
   - ✅ Working responses

---

## 🎉 Success Checklist

- [ ] Perplexity API key added to `.env`
- [ ] Server restarted
- [ ] "AI Assistant" visible in sidebar
- [ ] "AI Summary" button in channel headers
- [ ] AI Assistant page loads (`/dashboard/ai-assistant`)
- [ ] AI responses working

---

## 🚀 Next Steps

### Enable More Features (Optional)

#### 1. Smart Reply Suggestions (5 min)
Edit: `components/message-input.tsx`
Add: Reply suggestions above textarea

#### 2. Task Breakdown (5 min)
Edit: `components/TaskDetail.tsx`
Add: "AI Breakdown" button

#### 3. Sentiment Dashboard (10 min)
Edit: `app/admin/page.tsx`
Add: Sentiment card widget

**Full guide:** See `docs/AI_FEATURES_GUIDE.md`

---

## 📞 Need Help?

### Error persist kar raha hai?
1. Check console errors (F12)
2. Check terminal logs
3. Verify API key format: `pplx-xxxxxxxxx`

### Koi feature nahi dikh raha?
1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache
3. Restart dev server

---

**Setup complete! 🎉 Ab aap AI features use kar sakte ho!**

For detailed implementation: `AI_FEATURES_README.md`
