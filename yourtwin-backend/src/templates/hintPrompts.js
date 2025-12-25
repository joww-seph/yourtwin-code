// =====================================================
// HINT PROMPTS - ZPD SCAFFOLDING SYSTEM
//
// IMPORTANT: Levels 1-4 must NEVER give code solutions!
// Only Level 5 provides actual code fixes.
// =====================================================

export const SYSTEM_PROMPT = `You are a coding tutor who helps students learn by guiding them, not by giving answers. Be concise and clear.`;

// =====================================================
// LEVEL 1: GUIDING QUESTIONS ONLY
// Purpose: Make students think about the problem
// NEVER give answers, only ask questions
// =====================================================
export const LEVEL_1_PROMPT = `You are helping a student who is stuck on: "{problemTitle}"

Their current code:
\`\`\`{language}
{studentCode}
\`\`\`

Error message: {errorOutput}

YOUR TASK: Ask short guiding questions to help them think about:
1. What the problem is asking
2. What their code is currently doing wrong
3. What they should check or reconsider

RULES:
- Ask QUESTIONS only, do NOT give any answers
- Do NOT show any code
- Do NOT explain the solution
- Use simple, clear language`;

// =====================================================
// LEVEL 2: CONCEPT IDENTIFICATION
// Purpose: Point them to the right concept/algorithm
// NO code, NO step-by-step solution
// =====================================================
export const LEVEL_2_PROMPT = `Student is working on: "{problemTitle}"
Topic: {topic}

Their code:
\`\`\`{language}
{studentCode}
\`\`\`

YOUR TASK: Tell them WHAT concept or technique to use, not HOW to implement it.

Respond in this exact format:
**Concept:** [Name the algorithm, data structure, or programming concept]
\n**Why:** [One sentence explaining why this concept fits the problem]
\n**Hint:** [One sentence pointing them in the right direction]

RULES:
- Do NOT show any code
- Do NOT give step-by-step instructions`;

// =====================================================
// LEVEL 3: STRATEGY OUTLINE
// Purpose: High-level approach without implementation details
// NO code, just logical steps
// =====================================================
export const LEVEL_3_PROMPT = `Problem: "{problemTitle}"
Description: {problemDescription}

Student's code:
\`\`\`{language}
{studentCode}
\`\`\`

YOUR TASK: Give high-level strategy steps to solve this problem.

Format each step as:
1. [What to do] - [Why it's needed]

RULES:
- Describe WHAT to do, not HOW to code it
- Do NOT include any code syntax
- Do NOT use programming terms like "loop", "array" - use plain English like "go through each item", "store the values"
- Each step should be one short sentence`;

// =====================================================
// LEVEL 4: PSEUDOCODE
// Purpose: Detailed logic in plain English
// Still NO actual code syntax
// =====================================================
export const LEVEL_4_PROMPT = `Problem: "{problemTitle}"
Description: {problemDescription}
Examples: {examples}

Student's code:
\`\`\`{language}
{studentCode}
\`\`\`

YOUR TASK: Write pseudocode (plain English steps) showing the logic to solve this.

Format:
1. [Step in plain English]
2. [Next step]
...

RULES:
- Use simple English, NOT code syntax
- Write 5-7 clear steps
- Each step should be specific enough to translate to code
- Do NOT write actual {language} code
- Example good step: "Add each number to a running total"
- Example bad step: "sum += arr[i]" (this is code, not allowed)`;

// =====================================================
// LEVEL 5: SOLUTION WITH CODE
// Purpose: Fix the bug and explain
// This is the ONLY level that shows code
// =====================================================
export const LEVEL_5_PROMPT = `Problem: "{problemTitle}"

Student's broken code:
\`\`\`{language}
{studentCode}
\`\`\`

Error: {errorOutput}

YOUR TASK: Fix their code and explain the bug.

Format your response as:

**Bug:** [One sentence describing what's wrong]

**Fix:** [One sentence explaining how to fix it]

**Corrected Code:**
\`\`\`{language}
[The fixed code here]
\`\`\`

Keep explanations brief - focus on the fix.`;

// =====================================================
// COMPREHENSION CHECK
// =====================================================
export const COMPREHENSION_PROMPT = `The student received this hint:
"{hint}"

They answered: "{studentAnswer}"

Did they understand the concept? Reply with:
PASS - if they showed understanding
FAIL - if they didn't understand

Then give brief feedback (1 sentence).`;

// =====================================================
// REFUSAL MESSAGES
// =====================================================
export const REFUSAL_MESSAGES = {
  lockdown: "AI assistance is disabled for this assessment.",
  tooSoon: "Try working on this for at least 1 minute before asking for help.",
  noCodeChange: "Your code hasn't changed since the last hint. Try implementing the suggestion first.",
  quotaExceeded: "You've used all {count} hints for this activity.",
  highCompetency: "You've solved similar problems before! Try applying the same approach.",
  levelLocked: "Level {level} requires more attempts. Current: {attempts} attempts.",
  comprehensionRequired: "Answer this question first: {question}"
};

// =====================================================
// SOCRATIC FALLBACK QUESTIONS
// =====================================================
export const SOCRATIC_STARTERS = {
  understanding: [
    "What is this problem asking you to do?",
    "What should the output be for this input?",
    "What's your current approach?"
  ],
  debugging: [
    "What value does your variable have here?",
    "What happens when you trace through with the failing test?",
    "Which line produces the wrong output?"
  ],
  metacognitive: [
    "What similar problems have you solved?",
    "What pattern might apply here?",
    "What's the simplest case that works?"
  ]
};

// =====================================================
// BUILD PROMPT FOR LEVEL
// =====================================================
export const buildHintPrompt = (level, context) => {
  const templates = {
    1: LEVEL_1_PROMPT,
    2: LEVEL_2_PROMPT,
    3: LEVEL_3_PROMPT,
    4: LEVEL_4_PROMPT,
    5: LEVEL_5_PROMPT
  };

  let template = templates[level] || LEVEL_1_PROMPT;

  // Defaults
  if (!context.studentCode?.trim()) {
    context.studentCode = '// No code submitted yet';
  }
  if (!context.language) {
    context.language = 'cpp';
  }
  if (!context.errorOutput) {
    context.errorOutput = 'No error output';
  }

  // Replace placeholders
  for (const [key, value] of Object.entries(context)) {
    template = template.replaceAll(`{${key}}`, value || '');
  }

  return template;
};

// =====================================================
// BUILD REFUSAL MESSAGE
// =====================================================
export const buildRefusalMessage = (type, context = {}) => {
  let message = REFUSAL_MESSAGES[type] || REFUSAL_MESSAGES.tooSoon;

  for (const [key, value] of Object.entries(context)) {
    message = message.replaceAll(`{${key}}`, value || '');
  }

  return message;
};

// =====================================================
// CLEAN AI RESPONSE - Minimal cleanup
// =====================================================
export const cleanAIResponse = (response) => {
  if (!response || typeof response !== 'string') return '';

  let text = response.trim();

  // Remove XML tags if any
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // Clean whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text.length < 10 ? 'Unable to generate hint. Please try again.' : text;
};

export default {
  SYSTEM_PROMPT,
  LEVEL_1_PROMPT,
  LEVEL_2_PROMPT,
  LEVEL_3_PROMPT,
  LEVEL_4_PROMPT,
  LEVEL_5_PROMPT,
  COMPREHENSION_PROMPT,
  REFUSAL_MESSAGES,
  SOCRATIC_STARTERS,
  buildHintPrompt,
  buildRefusalMessage,
  cleanAIResponse
};
