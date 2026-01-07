// // Perplexity API Client Configuration
// // Add your Perplexity API key in .env: PERPLEXITY_API_KEY=your_key_here

// export class PerplexityClient {
//   private apiKey: string;
//   private baseUrl: string = 'https://api.perplexity.ai';

//   constructor(apiKey?: string) {
//     this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
//     if (!this.apiKey) {
//       throw new Error('Perplexity API key is required');
//     }
//   }

//   /**
//    * Generate AI response using Perplexity
//    */
// //   async chat(messages: Array<{ role: string; content: string }>, model: string = 'llama-3.1-sonar-small-128k-online') {
// //     try {
// //       const response = await fetch(`${this.baseUrl}/chat/completions`, {
// //         method: 'POST',
// //         headers: {
// //           'Authorization': `Bearer ${this.apiKey}`,
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({
// //           model,
// //           messages,
// //           temperature: 0.2,
// //           max_tokens: 1024,
// //         }),
// //       });

// //       if (!response.ok) {
// //         throw new Error(`Perplexity API error: ${response.statusText}`);
// //       }

// //       const data = await response.json();
// //       return data.choices[0].message.content;
// //     } catch (error) {
// //       console.error('Perplexity API Error:', error);
// //       throw error;
// //     }
// //   }



// async chat(messages, model = 'llama-3.1-sonar-small-128k-online') {
//   try {
//     const response = await fetch('https://api.perplexity.ai/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Authorization': `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`, // use env var instead
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         model,
//         messages,
//         temperature: 0.2,
//         max_tokens: 1024,
//       }),
//     });

//     // Read the body once and reuse it
//     const rawBody = await response.text();

//     if (!response.ok) {
//       let errorMsg;
//       try {
//         const err = JSON.parse(rawBody);
//         errorMsg = err?.error ? `${err.error.message || err.error}` : JSON.stringify(err);
//       } catch (e) {
//         errorMsg = rawBody;
//       }
//       throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\n${errorMsg}`);
//     }

//     const data = JSON.parse(rawBody);
//     return data.choices?.[0]?.message?.content ?? data;
//   } catch (error) {
//     console.error('Perplexity API Error:', error);
//     throw error;
//   }
// }






//   /**
//    * Summarize long text
//    */
//   async summarize(text: string): Promise<string> {
//     return this.chat([
//       {
//         role: 'system',
//         content: 'You are a helpful assistant that summarizes conversations concisely.',
//       },
//       {
//         role: 'user',
//         content: `Summarize the following conversation in 3-5 bullet points:\n\n${text}`,
//       },
//     ]);
//   }

//   /**
//    * Analyze sentiment of messages
//    */
//   async analyzeSentiment(messages: string[]): Promise<{
//     overall: 'positive' | 'neutral' | 'negative';
//     score: number;
//     summary: string;
//   }> {
//     const text = messages.join('\n\n');
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'You are a sentiment analysis expert. Analyze the overall sentiment and provide a score from -1 (very negative) to 1 (very positive).',
//       },
//       {
//         role: 'user',
//         content: `Analyze the sentiment of these messages and respond in JSON format with: {"overall": "positive|neutral|negative", "score": number, "summary": "brief explanation"}:\n\n${text}`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return { overall: 'neutral', score: 0, summary: response };
//     }
//   }

//   /**
//    * Auto-assign task to best team member
//    */
//   async suggestTaskAssignment(
//     taskDescription: string,
//     teamMembers: Array<{ name: string; skills: string[]; currentLoad: number }>
//   ): Promise<{ assignee: string; reason: string }> {
//     const teamInfo = teamMembers.map(m => 
//       `${m.name}: Skills - ${m.skills.join(', ')}, Current workload: ${m.currentLoad} tasks`
//     ).join('\n');

//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'You are a task assignment expert. Analyze task requirements and team member capabilities to suggest the best assignee.',
//       },
//       {
//         role: 'user',
//         content: `Task: "${taskDescription}"\n\nTeam:\n${teamInfo}\n\nSuggest the best person to assign this task and explain why. Respond in JSON format: {"assignee": "name", "reason": "explanation"}`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return { assignee: teamMembers[0].name, reason: 'Default assignment' };
//     }
//   }

//   /**
//    * Break down complex task into subtasks
//    */
//   async breakdownTask(taskTitle: string, taskDescription: string): Promise<string[]> {
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'You are a project management expert. Break down complex tasks into smaller, actionable subtasks.',
//       },
//       {
//         role: 'user',
//         content: `Break down this task into 3-7 smaller subtasks:\n\nTitle: ${taskTitle}\nDescription: ${taskDescription}\n\nReturn only a JSON array of subtask titles.`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return [taskTitle];
//     }
//   }

//   /**
//    * Generate smart reply suggestions
//    */
//   async generateReplySuggestions(
//     conversationHistory: string,
//     lastMessage: string
//   ): Promise<string[]> {
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'Generate 3 short, contextual reply suggestions (max 10 words each) for the last message in a conversation.',
//       },
//       {
//         role: 'user',
//         content: `Conversation:\n${conversationHistory}\n\nLast message: "${lastMessage}"\n\nProvide 3 reply options as JSON array of strings.`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return ['Thanks!', 'Got it', 'Will check'];
//     }
//   }

//   /**
//    * Extract action items from conversation
//    */
//   async extractActionItems(messages: string[]): Promise<Array<{
//     task: string;
//     assignee?: string;
//     deadline?: string;
//   }>> {
//     const text = messages.join('\n');
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'Extract action items from conversations. Identify tasks, assignees, and deadlines.',
//       },
//       {
//         role: 'user',
//         content: `Extract all action items from this conversation. Return as JSON array: [{"task": "...", "assignee": "...", "deadline": "..."}]\n\n${text}`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return [];
//     }
//   }

//   /**
//    * Smart search with natural language
//    */
//   async semanticSearch(
//     query: string,
//     documents: Array<{ id: string; content: string }>
//   ): Promise<Array<{ id: string; relevance: number }>> {
//     const docsText = documents.map((d, i) => `[${i}] ${d.content}`).join('\n\n');
    
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'You are a search expert. Rank documents by relevance to the query. Return JSON array of indices with relevance scores 0-1.',
//       },
//       {
//         role: 'user',
//         content: `Query: "${query}"\n\nDocuments:\n${docsText}\n\nReturn: [{"index": number, "relevance": number}]`,
//       },
//     ]);

//     try {
//       const results = JSON.parse(response);
//       return results.map((r: any) => ({
//         id: documents[r.index].id,
//         relevance: r.relevance,
//       }));
//     } catch {
//       return [];
//     }
//   }

//   /**
//    * Categorize message/task
//    */
//   async categorize(
//     text: string,
//     categories: string[]
//   ): Promise<{ category: string; confidence: number }> {
//     const response = await this.chat([
//       {
//         role: 'system',
//         content: 'Categorize the given text into one of the provided categories.',
//       },
//       {
//         role: 'user',
//         content: `Text: "${text}"\n\nCategories: ${categories.join(', ')}\n\nRespond in JSON: {"category": "...", "confidence": 0-1}`,
//       },
//     ]);

//     try {
//       return JSON.parse(response);
//     } catch {
//       return { category: categories[0], confidence: 0.5 };
//     }
//   }

//   /**
//    * Generate project status report
//    */
//   async generateProjectReport(
//     tasks: Array<{ title: string; status: string; assignee: string }>,
//     messages: string[]
//   ): Promise<string> {
//     const tasksText = tasks.map(t => `- ${t.title} (${t.status}) - ${t.assignee}`).join('\n');
//     const messagesText = messages.slice(-20).join('\n');

//     return this.chat([
//       {
//         role: 'system',
//         content: 'You are a project manager. Generate concise project status reports.',
//       },
//       {
//         role: 'user',
//         content: `Generate a project status report based on:\n\nTasks:\n${tasksText}\n\nRecent discussions:\n${messagesText}\n\nInclude: progress summary, blockers, next steps.`,
//       },
//     ]);
//   }
// }

// // Singleton instance
// let perplexityClient: PerplexityClient | null = null;

// export function getPerplexityClient(): PerplexityClient {
//   if (!perplexityClient) {
//     perplexityClient = new PerplexityClient();
//   }
//   return perplexityClient;
// }



// lib/perplexity-client.ts
// Perplexity API Client Configuration
// Add your Perplexity API key in .env: PERPLEXITY_API_KEY=your_key_here

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai';



constructor(apiKey?: string) {
  const key = (apiKey ?? process.env.PERPLEXITY_API_KEY ?? '').trim();

  if (!key) {
    throw new Error('Perplexity API key is required');
  }

  this.apiKey = key;
  this.baseUrl = 'https://api.perplexity.ai';

 
}


  /**
   * Generate AI response using Perplexity
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    model: string = 'sonar'
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      // Diagnostic: helpful to see if something else already read the body
      console.log('[PerplexityClient] response.bodyUsed (before read):', response.bodyUsed);

      // Read the body exactly once. If bodyUsed is true, attempt to recover via clone()
      let rawBody: string | null = null;

      if (response.bodyUsed) {
        // Some runtimes may allow clone(); try it as a fallback
        if (typeof (response as any).clone === 'function') {
          try {
            const cloned = (response as any).clone();
            rawBody = await cloned.text();
            console.warn('[PerplexityClient] response.bodyUsed was true — read body from clone() fallback.');
          } catch (cloneErr) {
            console.error('[PerplexityClient] clone() attempted but failed:', cloneErr);
            throw new Error('Response body was already consumed and clone() failed to recover it.');
          }
        } else {
          throw new Error('Response body was already consumed and clone() is not available in this runtime.');
        }
      } else {
        rawBody = await response.text(); // read once
      }

      rawBody = rawBody ?? '';

      // Try parse JSON; if not JSON, keep rawBody for errors/success fallback
      let data: any = null;
      try {
        data = rawBody ? JSON.parse(rawBody) : null;
      } catch (parseErr) {
        // not JSON — leave data as null
        data = null;
      }

      if (!response.ok) {
        // Build detailed error message
        let errorMsg: string;
        try {
          if (data && (data.error || data.message)) {
            errorMsg = data.error?.message || data.error || data.message || JSON.stringify(data);
          } else {
            errorMsg = rawBody || `${response.status} ${response.statusText}`;
          }
        } catch (e) {
          errorMsg = rawBody || `${response.status} ${response.statusText}`;
        }
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\n${errorMsg}`);
      }

      // Normal success — prefer structured content if present
      const content = data?.choices?.[0]?.message?.content ?? data ?? rawBody;
      return content;
    } catch (error) {
      console.error('[PerplexityClient] chat error:', error);
      throw error;
    }
  }

  /**
   * Summarize long text
   */
  async summarize(text: string): Promise<string> {
    return (await this.chat([
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes conversations concisely.',
      },
      {
        role: 'user',
        content: `Summarize the following conversation in 3-5 bullet points:\n\n${text}`,
      },
    ])) as string;
  }

  /**
   * Analyze sentiment of messages
   */
  async analyzeSentiment(messages: string[]): Promise<{
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    summary: string;
  }> {
    const text = messages.join('\n\n');
    const response = await this.chat([
      {
        role: 'system',
        content: 'You are a sentiment analysis expert. Analyze the overall sentiment and provide a score from -1 (very negative) to 1 (very positive).',
      },
      {
        role: 'user',
        content: `Analyze the sentiment of these messages and respond in JSON format with: {"overall": "positive|neutral|negative", "score": number, "summary": "brief explanation"}:\n\n${text}`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return { overall: 'neutral', score: 0, summary: String(response) };
    }
  }

  /**
   * Auto-assign task to best team member
   */
  async suggestTaskAssignment(
    taskDescription: string,
    teamMembers: Array<{ name: string; skills: string[]; currentLoad: number }>
  ): Promise<{ assignee: string; reason: string }> {
    const teamInfo = teamMembers.map(m =>
      `${m.name}: Skills - ${m.skills.join(', ')}, Current workload: ${m.currentLoad} tasks`
    ).join('\n');

    const response = await this.chat([
      {
        role: 'system',
        content: 'You are a task assignment expert. Analyze task requirements and team member capabilities to suggest the best assignee.',
      },
      {
        role: 'user',
        content: `Task: "${taskDescription}"\n\nTeam:\n${teamInfo}\n\nSuggest the best person to assign this task and explain why. Respond in JSON format: {"assignee": "name", "reason": "explanation"}`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return { assignee: teamMembers[0].name, reason: 'Default assignment' };
    }
  }

  /**
   * Break down complex task into subtasks
   */
  async breakdownTask(taskTitle: string, taskDescription: string): Promise<string[]> {
    const response = await this.chat([
      {
        role: 'system',
        content: 'You are a project management expert. Break down complex tasks into smaller, actionable subtasks.',
      },
      {
        role: 'user',
        content: `Break down this task into 3-7 smaller subtasks:\n\nTitle: ${taskTitle}\nDescription: ${taskDescription}\n\nReturn only a JSON array of subtask titles.`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return [taskTitle];
    }
  }

  /**
   * Generate smart reply suggestions
   */
  async generateReplySuggestions(
    conversationHistory: string,
    lastMessage: string
  ): Promise<string[]> {
    const response = await this.chat([
      {
        role: 'system',
        content: 'Generate 3 short, contextual reply suggestions (max 10 words each) for the last message in a conversation.',
      },
      {
        role: 'user',
        content: `Conversation:\n${conversationHistory}\n\nLast message: "${lastMessage}"\n\nProvide 3 reply options as JSON array of strings.`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return ['Thanks!', 'Got it', 'Will check'];
    }
  }

  /**
   * Extract action items from conversation
   */
  async extractActionItems(messages: string[]): Promise<Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>> {
    const text = messages.join('\n');
    const response = await this.chat([
      {
        role: 'system',
        content: 'Extract action items from conversations. Identify tasks, assignees, and deadlines.',
      },
      {
        role: 'user',
        content: `Extract all action items from this conversation. Return as JSON array: [{"task": "...", "assignee": "...", "deadline": "..."}]\n\n${text}`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  }

  /**
   * Smart search with natural language
   */
  async semanticSearch(
    query: string,
    documents: Array<{ id: string; content: string }>
  ): Promise<Array<{ id: string; relevance: number }>> {
    const docsText = documents.map((d, i) => `[${i}] ${d.content}`).join('\n\n');

    const response = await this.chat([
      {
        role: 'system',
        content: 'You are a search expert. Rank documents by relevance to the query. Return JSON array of indices with relevance scores 0-1.',
      },
      {
        role: 'user',
        content: `Query: "${query}"\n\nDocuments:\n${docsText}\n\nReturn: [{"index": number, "relevance": number}]`,
      },
    ]);

    try {
      const results = JSON.parse(response);
      return results.map((r: any) => ({
        id: documents[r.index].id,
        relevance: r.relevance,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Categorize message/task
   */
  async categorize(
    text: string,
    categories: string[]
  ): Promise<{ category: string; confidence: number }> {
    const response = await this.chat([
      {
        role: 'system',
        content: 'Categorize the given text into one of the provided categories.',
      },
      {
        role: 'user',
        content: `Text: "${text}"\n\nCategories: ${categories.join(', ')}\n\nRespond in JSON: {"category": "...", "confidence": 0-1}`,
      },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return { category: categories[0], confidence: 0.5 };
    }
  }

  /**
   * Generate project status report
   */
  async generateProjectReport(
    tasks: Array<{ title: string; status: string; assignee: string }>,
    messages: string[]
  ): Promise<string> {
    const tasksText = tasks.map(t => `- ${t.title} (${t.status}) - ${t.assignee}`).join('\n');
    const messagesText = messages.slice(-20).join('\n');

    return this.chat([
      {
        role: 'system',
        content: 'You are a project manager. Generate concise project status reports.',
      },
      {
        role: 'user',
        content: `Generate a project status report based on:\n\nTasks:\n${tasksText}\n\nRecent discussions:\n${messagesText}\n\nInclude: progress summary, blockers, next steps.`,
      },
    ]);
  }
}

// Singleton instance
let perplexityClient: PerplexityClient | null = null;

export function getPerplexityClient(): PerplexityClient {
  if (!perplexityClient) {
    perplexityClient = new PerplexityClient();
  }
  return perplexityClient;
}
