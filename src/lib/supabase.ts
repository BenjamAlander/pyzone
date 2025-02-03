import { createClient } from '@supabase/supabase-js';
import { Task } from './tasks';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveUserState(settings: any, lastCode: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // First try to get existing state
    const { data: existingState } = await supabase
      .from('user_state')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingState) {
      // Update existing state
      const { error } = await supabase
        .from('user_state')
        .update({
          settings,
          last_code: lastCode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Insert new state
      const { error } = await supabase
        .from('user_state')
        .insert({
          user_id: user.id,
          settings,
          last_code: lastCode,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving user state:', err);
  }
}

export async function loadUserState() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // Only throw if it's not a "no rows returned" error
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    // If no data exists, return default state
    if (!data) {
      return {
        settings: {
          theme: 'dark',
          fontSize: 'medium'
        },
        last_code: '# Start coding here\nprint("Hello, Developer!")'
      };
    }

    return data;
  } catch (err) {
    console.error('Error loading user state:', err);
    return null;
  }
}

export async function saveCompletedTask(task: Task) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // First check if the task is already completed
    const { data: existingTask } = await supabase
      .from('task_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_id', task.id)
      .maybeSingle();

    if (existingTask) {
      // Update the existing task to mark it as completed
      const { error } = await supabase
        .from('task_history')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('task_id', task.id);

      if (error) throw error;
    } else {
      // Insert new completed task
      const { error } = await supabase
        .from('task_history')
        .insert({
          task_id: task.id,
          title: task.title,
          description: task.description,
          user_id: user.id,
          difficulty: task.difficulty,
          category: task.category,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    // Check if we need to generate documentation
    const { count } = await supabase
      .from('task_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true);

    if (count && count % 5 === 0) {
      await generateDocumentation(count);
    }

    return true;
  } catch (error) {
    console.error('Error saving completed task:', error);
    throw error;
  }
}

export async function saveCustomTask(task: Omit<Task, 'id' | 'completed'>): Promise<Task | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('custom_tasks')
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        category: task.category,
        difficulty: task.difficulty,
        code: task.code
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving custom task:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty as 'easy' | 'medium' | 'hard',
      code: data.code,
      completed: false
    };
  } catch (error) {
    console.error('Error in saveCustomTask:', error);
    return null;
  }
}

async function generateDocumentation(tasksCompleted: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Get the last 5 completed tasks
    const { data: recentTasks } = await supabase
      .from('task_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (!recentTasks) return;

    const content = `
# Progress Report - ${new Date().toLocaleDateString()}

## Recent Achievements
${recentTasks.map((task, index) => `${index + 1}. ${task.title} (${task.difficulty})`).join('\n')}

## Skills Practiced
${recentTasks.map(task => `- ${task.description}`).join('\n')}

## Categories Covered
${[...new Set(recentTasks.map(task => task.category))].map(category => `- ${category}`).join('\n')}

## Total Tasks Completed: ${tasksCompleted}
    `.trim();

    await supabase
      .from('documentation_entries')
      .insert({
        title: `Progress Report - ${tasksCompleted} Tasks`,
        content,
        tasks_completed: tasksCompleted,
        user_id: user.id
      });
  } catch (error) {
    console.error('Error generating documentation:', error);
  }
}