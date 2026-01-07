# 🚀 Quick Start Guide - AI Features

## ⚠️ IMPORTANT: Setup Required First!

### Step 1: Get Your Perplexity API Key
1. Go to [Perplexity AI](https://www.perplexity.ai/)
2. Sign up/login and get your API key
3. Copy the key (starts with `pplx-...`)

### Step 2: Add API Key to .env File
1. Open `.env` file in project root
2. Add this line:
   ```env
   PERPLEXITY_API_KEY=pplx-your-actual-key-here
   ```
3. Save the file

### Step 3: Restart Server (CRITICAL!)
```bash
Ctrl+C          # Stop server
pnpm dev        # Start again
```

### Step 4: Hard Refresh Browser
```
Ctrl+Shift+R    # Clear cache and reload
```

**Without this setup, you'll see "AI service not configured" error!**

---

## Feature 1: AI Message Rewriter ✨

### Where to Find It
Look for the **purple sparkle button** (⚡) in your message input box!

```
┌─────────────────────────────────────────────────┐
│ Message Input                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📎  😊  ⚡  [Type message here...]          │ │
│ └─────────────────────────────────────────────┘ │
│                                          [Send] │
└─────────────────────────────────────────────────┘
     ↑    ↑   ↑
   Attach Emoji Sparkle
```

### How to Use (3 Steps)

**Step 1**: Type your message
```
Input: "hey can u send me the report asap"
```

**Step 2**: Click sparkle button, select tone
```
Choose from:
💼 Professional
😊 Friendly  
🎩 Formal
👋 Casual
📝 Shorter
📋 Detailed
```

**Step 3**: Click "Rewrite" → "Apply"
```
Result: "Could you please send me the report at your earliest convenience?"
```

### All Tone Examples

**Original Message**: 
> "hey whats up? can u check the dashboard? think theres a bug"

| Tone | Result |
|------|--------|
| 💼 Professional | "Hello! Could you please review the dashboard when you have a moment? I believe there may be a bug that needs attention." |
| 😊 Friendly | "Hey there! Would you mind checking out the dashboard? I think I spotted a bug!" |
| 🎩 Formal | "Good day. Please review the dashboard at your earliest convenience. It appears there is a technical issue requiring attention." |
| 👋 Casual | "Hey! Can you check the dashboard real quick? Pretty sure there's a bug in there." |
| 📝 Shorter | "Please check dashboard - possible bug." |
| 📋 Detailed | "Hello! I was reviewing the dashboard and noticed some unexpected behavior that appears to be a bug. Could you please investigate this issue when you have time? I believe it may need attention to ensure proper functionality." |

---

## Feature 2: AI Description Generator 🤖

### Where to Find It
On the **Create New Project** page!

```
Create New Project
┌──────────────────────────────────────────────┐
│ Title                                        │
│ [E-commerce Website Redesign          ]     │
│                                              │
│ Description              [⚡ AI Generate]    │
│ ┌──────────────────────────────────────┐    │
│ │ (Auto-generated description here)    │    │
│ │                                      │    │
│ └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### How to Use (2 Steps)

**Step 1**: Enter project title
```
Title: "Customer Support Portal"
```

**Step 2**: Click "AI Generate"
```
Generated Description:
"Develop a comprehensive customer support portal to streamline 
ticket management, enable self-service resources, and provide 
real-time chat assistance. The portal will integrate with 
existing CRM systems and offer analytics dashboard for support 
team performance tracking."
```

### More Examples

| Project Title | AI Generated Description |
|---------------|--------------------------|
| "Mobile App Analytics Dashboard" | "Create a mobile analytics dashboard to track user engagement, app performance, and key metrics with real-time insights, customizable widgets, and export capabilities." |
| "Employee Onboarding System" | "Build an automated employee onboarding system to streamline new hire processes, manage documentation, and track progress through customizable workflows and notifications." |
| "Inventory Management System" | "Develop a comprehensive inventory management solution to track stock levels, automate reordering, and generate reports for warehouse operations and supply chain optimization." |
| "Social Media Content Scheduler" | "Design a content scheduling platform for managing social media posts across multiple platforms with calendar views, collaboration tools, and performance analytics." |

---

## 🎯 Pro Tips

### Message Rewriter
1. ✅ **Write naturally first** - Type your message normally, let AI polish it
2. ✅ **Try different tones** - Switch between tones to see which fits best
3. ✅ **Edit after AI** - The rewritten message is editable before sending
4. ✅ **Copy useful rewrites** - Use the copy button to save good versions
5. ✅ **Use shortcuts**:
   - Professional = for managers/clients
   - Friendly = for team members
   - Concise = for quick updates
   - Detailed = for complex explanations

### Description Generator
1. ✅ **Write clear titles** - Better titles = better descriptions
2. ✅ **Generate early** - Click AI Generate as soon as you have a title
3. ✅ **Customize after** - AI gives you a starting point, edit to your needs
4. ✅ **Use for brainstorming** - Even if you don't use it, AI descriptions spark ideas
5. ✅ **Try variations** - Slightly change your title to get different descriptions

---

## 🔥 Common Use Cases

### Use Message Rewriter When:
- 📧 Sending messages to managers or clients
- 🌍 Communicating with international teams
- 📝 Writing important project updates
- 🤝 Need to sound more professional
- ⚡ Want to save time on rephrasing

### Use Description Generator When:
- 🆕 Starting a new project
- 💭 Need inspiration for project scope
- ⏱️ Short on time to write descriptions
- 📋 Creating multiple projects quickly
- 🎯 Want consistent description quality

---

## 📊 Feature Comparison

| Feature | Message Rewriter | Description Generator |
|---------|-----------------|----------------------|
| **Location** | Message input box | Project creation form |
| **Icon** | ⚡ Purple sparkle | ⚡ AI Generate button |
| **Input** | Any message text | Project/task title |
| **Output** | Rewritten message | 2-3 sentence description |
| **Options** | 6 tone choices | Auto (based on type) |
| **Time Saved** | 30-60 seconds | 2-3 minutes |
| **Customizable** | ✅ Edit before sending | ✅ Edit after generating |

---

## ⚡ Keyboard Shortcuts (Coming Soon)

| Action | Shortcut |
|--------|----------|
| Open Message Rewriter | `Ctrl/Cmd + Shift + R` |
| Generate Description | `Ctrl/Cmd + Shift + G` |
| Apply Rewrite | `Enter` (in dialog) |
| Close Dialog | `Esc` |

---

## 🎨 Visual Guide

### Message Rewriter Flow
```
Type Message → Click ⚡ → Select Tone → Click Rewrite
     ↓              ↓            ↓            ↓
"hey thanks"   [Dialog]   [Professional]  [Loading...]
                                                ↓
                                    "Thank you for your assistance."
                                                ↓
                                    [Copy] or [Apply] → ✅ Done!
```

### Description Generator Flow
```
Enter Title → Click "AI Generate" → Review → Edit if needed → Save Project
     ↓              ↓                  ↓            ↓              ↓
"New Website"  [Loading...]    [Description]  [Optional]   [Created! ✅]
```

---

## 🚨 Troubleshooting

### Message Rewriter Button Disabled?
- ✅ Make sure you've typed a message first
- ✅ Check if you're submitting/uploading files
- ✅ Verify you're logged in

### Description Generator Not Working?
- ✅ Enter a project title first
- ✅ Wait for any ongoing operations to complete
- ✅ Check your internet connection
- ✅ Verify Perplexity API key is configured

### AI Taking Too Long?
- ⏱️ Normal response time: 2-5 seconds
- 🔄 If > 10 seconds, try again
- 🌐 Check network connection
- 🔑 Verify API key is valid

---

## 📈 Benefits

### For Users
- ⚡ **Save time** - No more rephrasing manually
- 📝 **Better communication** - Professional tone automatically
- 🎯 **Consistency** - Uniform message quality
- 🧠 **Learn** - See how AI improves your writing

### For Teams
- 🤝 **Professional image** - Consistent communication style
- 🌍 **Better collaboration** - Clear, well-written messages
- ⏰ **Faster workflows** - Quick project setups
- 📊 **Quality standards** - AI ensures minimum quality level

---

## 🎓 Best Practices

### DO ✅
- Write your message first, then enhance with AI
- Try multiple tones to find the best fit
- Edit AI suggestions to match your style
- Use for important communications
- Generate descriptions early in project setup

### DON'T ❌
- Rely 100% on AI without reviewing
- Use AI for every casual team message
- Ignore context - AI doesn't know your situation
- Send without reading the AI output
- Use inappropriate tones for the audience

---

## 🎯 Success Metrics

After using these features, you should see:
- 📈 30% faster message composition for formal communications
- 📝 50% time saved on project description writing
- ✅ More professional, consistent communication
- 🎨 Better project clarity and scope definition
- 😊 Improved team collaboration

---

## 🔗 Next Steps

1. **Try Message Rewriter** - Open any chat, type a casual message, click sparkle
2. **Test Description Generator** - Go to Create New Project, enter a title
3. **Compare Tones** - Rewrite same message in all 6 tones
4. **Share with Team** - Show colleagues these new features
5. **Give Feedback** - Let developers know what works!

---

**Quick Access**:
- 💬 Message Rewriter: Any message input → Purple sparkle icon
- 📋 Description Generator: Dashboard → Tasks → New Project → AI Generate button

**Need Help?** Check the full documentation: `AI_MESSAGE_DESCRIPTION_FEATURES.md`

---

✨ **Happy AI-assisted communication!** ✨
