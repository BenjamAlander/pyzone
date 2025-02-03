import OpenAI from 'openai';
import { Task } from './tasks';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OpenAI API key is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

export async function generateCodeCompletion(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful coding assistant. Provide clear, concise code examples and explanations. Keep responses brief and to the point. Do not use markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error generating code completion:', error);
    throw new Error('Failed to generate code completion');
  }
}

export async function runCode(code: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Python code executor. Execute the provided code and return ONLY the output. If there are errors, return ONLY a brief error message."
        },
        {
          role: "user",
          content: `Execute this Python code and return only the output:\n\n${code}`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "No output generated.";
  } catch (error) {
    console.error('Error running code:', error);
    throw new Error('Failed to run code');
  }
}

export async function checkTaskCompletion(code: string, output: string, task: Task): Promise<boolean> {
  if (!code || !output || !task) {
    console.error('Missing required parameters for task completion check');
    return false;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Python code evaluator. Your task is to determine if the submitted code successfully completes the given programming task.

Rules for evaluation:
1. Focus on functionality, not style
2. Accept different valid approaches that achieve the same result
3. Ignore cosmetic differences:
   - Variable names can be different
   - String quotes can be single or double
   - Print formatting can vary (comma-separated vs f-strings vs .format())
   - Whitespace and formatting
4. Accept more sophisticated solutions that still meet the requirements
5. For output comparison:
   - Ignore leading/trailing whitespace
   - Accept equivalent string formats
   - Accept equivalent number formats
6. For tasks requiring specific output:
   - Focus on the content being equivalent
   - Accept variations in punctuation and spacing
   - Accept both single and double quotes
   - Accept different ways of string concatenation

Respond ONLY with "true" or "false"`
        },
        {
          role: "user",
          content: `Task Description: ${task.description}
Category: ${task.category}
Difficulty: ${task.difficulty}

Example Solution:
${task.code}

Submitted Code:
${code}

Actual Output:
${output}

Does this solution correctly complete the task requirements? Answer only with "true" or "false".`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.1,
      max_tokens: 10,
    });

    const result = completion.choices[0]?.message?.content?.toLowerCase().trim();
    
    if (result !== 'true' && result !== 'false') {
      console.error('Invalid response from task completion check:', result);
      return false;
    }

    return result === 'true';
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking task completion:', error.message);
    } else {
      console.error('Unknown error checking task completion');
    }
    return false;
  }
}

export async function generateMilestone(): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Python programming instructor. Generate a short, focused learning task that helps users learn Python programming. Keep it under 50 words."
        },
        {
          role: "user",
          content: "Generate a Python programming task"
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.8,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content || "Failed to generate milestone.";
  } catch (error) {
    console.error('Error generating milestone:', error);
    throw new Error('Failed to generate milestone');
  }
}