# AI Features Implementation Guide - Perplexity API Integration

## 🎯 Overview
Yeh document aapko guide karega ki **Perplexity API** ko aapke chat application me kaise integrate karein.

---

## 📋 Prerequisites

### 1. Perplexity API Key Setup
```bash
# .env file me add karein:
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**API Key kahan se le:**
1. Visit: https://www.perplexity.ai/settings/api
2. Sign up/Login
3. Generate API Key
4. Copy and paste in `.env`

---

## 🚀 Quick Start

### Step 1: Install Dependencies (Already Included)
```bash
# No extra dependencies needed
# Perplexity API uses standard fetch
```

### Step 2: Test AI Client
```bash
# Create a test file
node --loader ts-node/esm test-ai.ts
```

**test-ai.ts:**
```typescript
import { getPerplexityClient } from './lib/perplexity-client';

async function test() {
  const ai = getPerplexityClient();
  const summary = await ai.summarize('User1: Hi\nUser2: Hello\nUser1: How are you?');
  console.log('Summary:', summary);
}

test();
```

---

## 📦 Features Implementation

### ✅ FEATURE 1: Message Summarization

**Where to Add:**
- **Channel Header** (`components/channel-header.tsx`)
- **Direct Message Header** 

**Code Example:**
```tsx
import { MessageSummarizer } from '@/components/message-summarizer';

// Inside your channel component:
<MessageSummarizer channelId={channelId} limit={50} />
```

**User Flow:**
1. User clicks "AI Summary" button
2. AI analyzes last 50 messages
3. Shows bullet-point summary in modal

---

### ✅ FEATURE 2: Smart Reply Suggestions

**Where to Add:**
- **Message Input Component** (`components/message-input.tsx`)

**Implementation:**
```tsx
// Add state for suggestions
const [suggestions, setSuggestions] = useState<string[]>([]);

// Fetch suggestions when user receives a message
const fetchSuggestions = async (lastMessageId: string) => {
  const res = await fetch('/api/ai/suggest-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, lastMessageId }),
  });
  const data = await res.json();
  setSuggestions(data.suggestions);
};

// Display suggestions above input
{suggestions.length > 0 && (
  <div className="flex gap-2 mb-2">
    {suggestions.map((s, i) => (
      <Button
        key={i}
        variant="outline"
        size="sm"
        onClick={() => setMessage(s)}
      >
        {s}
      </Button>
    ))}
  </div>
)}
```

---

### ✅ FEATURE 3: Task Breakdown

**Where to Add:**
- **Task Detail Modal** (`components/TaskDetail.tsx`)

**Implementation:**
```tsx
import { Sparkles } from 'lucide-react';

const breakdownTask = async () => {
  const res = await fetch('/api/ai/task-breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId: task.id }),
  });
  const data = await res.json();
  
  // Create subtasks
  for (const subtask of data.subtasks) {
    await createSubtask(subtask);
  }
  
  toast.success('Task broken down successfully!');
};

// Add button in UI:
<Button onClick={breakdownTask} variant="outline">
  <Sparkles className="h-4 w-4 mr-2" />
  AI Breakdown
</Button>
```

---

### ✅ FEATURE 4: Sentiment Analysis Dashboard

**Where to Add:**
- **Admin Dashboard** (`app/admin/page.tsx`)

**Implementation:**
```tsx
const [sentiment, setSentiment] = useState<any>(null);

useEffect(() => {
  const fetchSentiment = async () => {
    const res = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: 'week' }),
    });
    const data = await res.json();
    setSentiment(data.sentiment);
  };
  
  fetchSentiment();
}, []);

// Display sentiment card
<Card>
  <CardHeader>
    <CardTitle>Team Sentiment (Last Week)</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4">
      <div className={`text-4xl ${
        sentiment?.overall === 'positive' ? 'text-green-500' :
        sentiment?.overall === 'negative' ? 'text-red-500' :
        'text-gray-500'
      }`}>
        {sentiment?.overall === 'positive' ? '😊' :
         sentiment?.overall === 'negative' ? '😟' : '😐'}
      </div>
      <div>
        <p className="text-2xl font-bold">
          {sentiment?.overall?.toUpperCase()}
        </p>
        <p className="text-sm text-gray-600">
          Score: {(sentiment?.score * 100).toFixed(0)}%
        </p>
      </div>
    </div>
    <p className="mt-4 text-sm text-gray-700">
      {sentiment?.summary}
    </p>
  </CardContent>
</Card>
```

---

### ✅ FEATURE 5: AI Project Assistant

**Where to Add:**
- **New Page**: `app/dashboard/ai-assistant/page.tsx`
- **Add to Sidebar Navigation**

**Implementation:**
```tsx
import AIAssistant from '@/components/ai-assistant';

export default function AIAssistantPage() {
  return <AIAssistant />;
}
```

**Add to Sidebar:**
```tsx
// In sidebar.tsx
import { Bot } from 'lucide-react';

const sidebarItems = [
  // ... existing items
  {
    title: 'AI Assistant',
    href: '/dashboard/ai-assistant',
    icon: Bot,
  },
];
```

---

## 🔧 Advanced Customization

### Custom AI Models
```typescript
// Use different Perplexity models:
const models = {
  fast: 'llama-3.1-sonar-small-128k-online',      // Fast, cheaper
  balanced: 'llama-3.1-sonar-large-128k-online',  // Balanced
  accurate: 'llama-3.1-sonar-huge-128k-online',   // Most accurate
};

// In perplexity-client.ts
await perplexity.chat(messages, models.balanced);
```

### Rate Limiting
```typescript
// Add rate limiting in API routes:
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
});

// Apply to routes
export async function POST(req: NextRequest) {
  // ... existing code
}
```

---

## 💰 Cost Optimization

### 1. Cache Results
```typescript
// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();

function getCached(key: string) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data;
  }
  return null;
}

function setCache(key: string, data: any, ttl = 3600000) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

// Usage in API:
const cacheKey = `summary:${channelId}`;
const cached = getCached(cacheKey);
if (cached) return NextResponse.json(cached);

// ... generate summary
setCache(cacheKey, result);
```

### 2. Batch Requests
```typescript
// Instead of individual calls, batch multiple requests
const results = await Promise.all([
  ai.summarize(text1),
  ai.sentiment(text2),
  ai.categorize(text3),
]);
```

---

## 🧪 Testing

### Unit Tests
```typescript
// test-ai-features.test.ts
import { getPerplexityClient } from './lib/perplexity-client';

describe('AI Features', () => {
  it('should summarize messages', async () => {
    const ai = getPerplexityClient();
    const summary = await ai.summarize('Test conversation');
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);
  });

  it('should analyze sentiment', async () => {
    const ai = getPerplexityClient();
    const result = await ai.analyzeSentiment(['Great job!', 'Well done!']);
    expect(result.overall).toBe('positive');
  });
});
```

---

## 📊 Usage Analytics

### Track AI Feature Usage
```typescript
// Add to database schema:
model AIUsageLog {
  id        String   @id @default(cuid())
  userId    String
  feature   String   // 'summarize', 'sentiment', etc.
  tokens    Int?
  createdAt DateTime @default(now())
}

// Log usage in API routes:
await db.aIUsageLog.create({
  data: {
    userId: session.user.id,
    feature: 'summarize',
    tokens: estimatedTokens,
  },
});
```

---

## 🎨 UI/UX Best Practices

### 1. Loading States
```tsx
{loading && (
  <div className="flex items-center gap-2 text-blue-600">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>AI is thinking...</span>
  </div>
)}
```

### 2. Error Handling
```tsx
try {
  const result = await fetch('/api/ai/...');
  // ...
} catch (error) {
  toast.error('AI feature temporarily unavailable. Please try again.');
  // Log error for debugging
  console.error('AI Error:', error);
}
```

### 3. User Feedback
```tsx
toast.success('AI Summary generated! 🎉');
toast.info('Analyzing sentiment... This may take a moment');
```

---

## 🔐 Security Considerations

### 1. API Key Protection
```typescript
// Never expose API key in client-side code
// Always call from server-side (API routes)
```

### 2. User Data Privacy
```typescript
// Don't send sensitive data to AI
const sanitizeContent = (text: string) => {
  return text.replace(/password|secret|token/gi, '[REDACTED]');
};
```

### 3. Rate Limiting
```typescript
// Implement per-user rate limits
const userLimit = await checkUserLimit(userId);
if (userLimit.exceeded) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Try again later.' },
    { status: 429 }
  );
}
```

---

## 📈 Monitoring & Debugging

### Enable Logging
```typescript
// In perplexity-client.ts
const DEBUG = process.env.AI_DEBUG === 'true';

if (DEBUG) {
  console.log('[AI Request]', {
    model,
    messages: messages.slice(0, 2), // First 2 messages only
    timestamp: new Date().toISOString(),
  });
}
```

---

## 🎯 Next Steps

1. **Start Simple**: Implement message summarization first
2. **Test Thoroughly**: Use on your team's real data
3. **Gather Feedback**: See what users find most helpful
4. **Iterate**: Add more features based on usage
5. **Optimize**: Monitor costs and performance

---

## 📞 Support

- **Perplexity Docs**: https://docs.perplexity.ai
- **Issues**: Create GitHub issue in your repo
- **Community**: Join Discord/Slack for AI integrations

---

## 🔥 Pro Tips

1. **Use Caching**: Cache AI responses for 1 hour to save costs
2. **Batch Operations**: Process multiple items together
3. **Progressive Enhancement**: Make AI features optional, not required
4. **Fallback**: Always have non-AI alternatives
5. **Monitor Costs**: Track API usage daily

---

**Happy Coding! 🚀**
