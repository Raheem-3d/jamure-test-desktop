# AI Message & Description Features - Complete Guide

## 🎉 Features Added

### 1. **AI Message Rewriter** ✨
Improve and rewrite messages before sending with AI assistance.

#### Location
- **Component**: `message-input.tsx`
- **Button**: Purple sparkle icon (⚡) next to emoji picker
- **API**: `/api/ai/rewrite`

#### How to Use
1. Type your message in the message input field
2. Click the purple **Sparkles** button (⚡)
3. Select a tone from the dropdown:
   - 💼 **Professional** - Clear, workplace-appropriate
   - 😊 **Friendly** - Warm and conversational
   - 🎩 **Formal** - Polished, official communication
   - 👋 **Casual** - Relaxed and informal
   - 📝 **Shorter** - Concise, brief version
   - 📋 **Detailed** - Expanded with more context
4. Click **"Rewrite Message"**
5. Review the AI-generated version
6. Click **"Apply This Version"** to use it, or **Copy** to save it

#### Features
- Real-time message improvement
- 6 different tone options
- Copy to clipboard functionality
- Preview before applying
- Works with any message length

---

### 2. **AI Description Generator** 🤖
Automatically generate project descriptions from titles.

#### Location
- **Component**: `description-generator.tsx`
- **Page**: `/dashboard/tasks/new` (Create New Project)
- **Button**: "AI Generate" next to Description label
- **API**: `/api/ai/generate-description`

#### How to Use
1. Navigate to **Create New Project** page
2. Enter a project title (e.g., "E-commerce Website Redesign")
3. Click **"AI Generate"** button next to Description field
4. AI will generate a 2-3 sentence professional description
5. Description appears in the textarea automatically
6. Edit the generated description if needed

#### Features
- Instant description generation
- Context-aware based on title
- Professional, actionable descriptions
- 2-3 sentence format
- Editable after generation

---

## 📂 Files Created/Modified

### New API Routes
1. **`/app/api/ai/rewrite/route.ts`**
   - Rewrites messages with different tones
   - Uses Perplexity AI for natural language processing
   - Returns original + rewritten message

2. **`/app/api/ai/generate-description/route.ts`**
   - Generates descriptions from titles
   - Supports project, task, channel types
   - Returns professional 2-3 sentence descriptions

### New Components
3. **`/components/message-rewriter.tsx`**
   - Dialog-based message rewriter UI
   - Tone selector with 6 options
   - Copy and apply functionality
   - Real-time preview

4. **`/components/description-generator.tsx`**
   - Reusable AI description button
   - Works for projects, tasks, channels
   - Loading states and error handling
   - Configurable size and appearance

### Modified Files
5. **`/components/message-input.tsx`**
   - Added MessageRewriter component
   - Placed between emoji picker and message textarea
   - Purple sparkle icon for visibility

6. **`/app/dashboard/tasks/new/page.tsx`**
   - Added DescriptionGenerator component
   - Positioned next to Description label
   - Auto-fills description field

---

## 🔧 API Endpoints

### POST `/api/ai/rewrite`
**Purpose**: Rewrite messages with different tones

**Request Body**:
```json
{
  "message": "hey can u send me that file",
  "tone": "professional"
}
```

**Response**:
```json
{
  "original": "hey can u send me that file",
  "rewritten": "Could you please send me that file when you have a moment?",
  "tone": "professional"
}
```

**Available Tones**:
- `professional` - Workplace-appropriate
- `friendly` - Warm and conversational
- `formal` - Official communication
- `casual` - Relaxed tone
- `concise` - Shorter version
- `detailed` - Expanded version

---

### POST `/api/ai/generate-description`
**Purpose**: Generate descriptions from titles

**Request Body**:
```json
{
  "title": "Customer Portal Development",
  "type": "project"
}
```

**Response**:
```json
{
  "title": "Customer Portal Development",
  "description": "Develop a comprehensive customer portal to enable clients to manage their accounts, view orders, and access support resources. The portal will include secure authentication, real-time updates, and a responsive design for mobile and desktop users.",
  "type": "project"
}
```

**Supported Types**:
- `project` (default)
- `task`
- `channel`

---

## 🎨 UI/UX Details

### Message Rewriter Dialog
- **Trigger**: Purple sparkle button in message input
- **Size**: Medium modal (600px max-width)
- **Sections**:
  1. Original message display (gray background)
  2. Tone selector dropdown (6 options with emojis)
  3. Rewrite button (purple)
  4. Rewritten message display (purple background)
  5. Copy and Apply buttons

### Description Generator Button
- **Position**: Right side of Description label
- **Style**: Outline button with purple accent
- **States**:
  - Disabled when title is empty
  - Loading spinner during generation
  - Success toast after generation

---

## 🚀 Usage Examples

### Example 1: Rewrite Casual Message to Professional
**Original**:
```
hey whats up? can u check the dashboard? think theres a bug
```

**Professional Rewrite**:
```
Hello! Could you please review the dashboard when you have a moment? 
I believe there may be a bug that needs attention.
```

---

### Example 2: Generate Project Description
**Title**: "Mobile App Analytics Dashboard"

**Generated Description**:
```
Create a comprehensive mobile analytics dashboard to track user engagement, 
app performance, and key metrics. The dashboard will provide real-time insights 
with customizable widgets, export capabilities, and role-based access controls.
```

---

## 🔐 Security & Authentication
- All endpoints require valid session authentication
- Uses `getServerSession()` from NextAuth
- Returns 401 for unauthorized requests
- Session user information logged for audit

---

## ⚙️ Configuration

### Environment Variables Required
```env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### Perplexity Client
Both features use the `PerplexityClient` class:
- File: `/lib/perplexity-client.ts`
- Model: `llama-3.1-sonar-small-128k-online`
- Max tokens: 500-800 depending on feature

---

## 🐛 Error Handling

### Message Rewriter
- Validates message is not empty
- Shows error toast on API failure
- Preserves original message on error
- Removes quotes from AI response

### Description Generator
- Requires title before generating
- Shows helpful error messages
- Disables button when title is empty
- Handles API timeouts gracefully

---

## 📱 Responsive Design
- Both components work on mobile and desktop
- Dialog modals are touch-friendly
- Buttons have proper touch targets (44px min)
- Text is readable on all screen sizes

---

## 🎯 Future Enhancements
- [ ] Add translation support for messages
- [ ] Generate task descriptions automatically
- [ ] Suggest message replies based on context
- [ ] Tone analysis before sending
- [ ] Message templates with AI
- [ ] Multi-language description generation

---

## 📊 Performance Considerations
- API calls are debounced in UI
- Loading states prevent duplicate requests
- Toast notifications for user feedback
- Graceful degradation on API failures

---

## 🔗 Integration Points

### Message Rewriter integrates with:
- Message input component
- Real-time chat system
- Emoji picker
- File attachments

### Description Generator integrates with:
- Project creation form
- Task creation (future)
- Channel creation (future)
- Organization setup (future)

---

## 📝 Testing Checklist

### Message Rewriter
- [ ] Button appears in message input
- [ ] Dialog opens on button click
- [ ] All 6 tones work correctly
- [ ] Copy to clipboard works
- [ ] Apply updates the message field
- [ ] Loading states display properly
- [ ] Error handling works

### Description Generator
- [ ] Button appears on project form
- [ ] Disabled when title is empty
- [ ] Generates description on click
- [ ] Description fills textarea
- [ ] Can edit generated description
- [ ] Loading spinner shows
- [ ] Success toast appears

---

## 🎓 Developer Notes

### To add more tones to Message Rewriter:
Edit `/app/api/ai/rewrite/route.ts`:
```typescript
const toneInstructions = {
  // Add new tone here
  humorous: "Rewrite this message with subtle humor while staying professional.",
}
```

Then update `/components/message-rewriter.tsx`:
```typescript
const tones = [
  { value: "humorous", label: "Humorous", icon: "😄" },
]
```

### To support more entity types in Description Generator:
The component already supports `type` prop:
```tsx
<DescriptionGenerator
  title={title}
  onGenerate={setDescription}
  type="task" // or "channel", "project"
/>
```

---

## 🏆 Best Practices
1. Always provide user feedback (toasts)
2. Disable buttons during loading
3. Validate input before API calls
4. Clean AI responses (remove quotes, trim)
5. Make features discoverable with icons
6. Provide helpful placeholder text
7. Allow editing of AI-generated content

---

## 📞 Support
If you encounter issues:
1. Check Perplexity API key is set
2. Verify user is authenticated
3. Check browser console for errors
4. Review API endpoint logs
5. Test with simple inputs first

---

**Created**: November 11, 2025  
**Version**: 1.0.0  
**AI Provider**: Perplexity AI  
**Framework**: Next.js 15.2.4 + React 19
