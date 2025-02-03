import { supabase } from './supabase';

export interface Task {
  id: string;
  category: string;
  title: string;
  description: string;
  code: string;
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const initialTasks: Task[] = [
  {
    id: "1",
    category: "Basics",
    title: "Hello World",
    description: "Write a program that prints 'Hello, World!' to the console.",
    code: "print('Hello, World!')",
    completed: false,
    difficulty: "easy"
  },
  {
    id: "2",
    category: "Variables",
    title: "Name and Age",
    description: "Create variables for name and age, then print 'My name is [name] and I am [age] years old.'",
    code: "name = 'Alice'\nage = 25\nprint(f'My name is {name} and I am {age} years old.')",
    completed: false,
    difficulty: "easy"
  },
  {
    id: "3",
    category: "Numbers",
    title: "Simple Addition",
    description: "Create a program that adds two numbers (10 and 20) and prints the sum.",
    code: "a = 10\nb = 20\nprint(a + b)",
    completed: false,
    difficulty: "easy"
  },
  {
    id: "4",
    category: "Strings",
    title: "String Concatenation",
    description: "Combine two strings 'Hello' and 'Python' with a space between them.",
    code: "str1 = 'Hello'\nstr2 = 'Python'\nprint(f'{str1} {str2}')",
    completed: false,
    difficulty: "easy"
  },
  {
    id: "5",
    category: "Input",
    title: "User Input",
    description: "Get user's name as input and print 'Hello, [name]!'",
    code: "name = input('Enter your name: ')\nprint(f'Hello, {name}!')",
    completed: false,
    difficulty: "medium"
  }
];

export async function fetchTasks(): Promise<Task[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return initialTasks;

    // Get completed tasks from task_history
    const { data: completedTasksData, error: historyError } = await supabase
      .from('task_history')
      .select('task_id, completed')
      .eq('user_id', user.id);

    if (historyError) {
      console.error('Error fetching task history:', historyError);
      return initialTasks;
    }

    // Get custom tasks
    const { data: customTasksData, error: customError } = await supabase
      .from('custom_tasks')
      .select('*')
      .eq('user_id', user.id);

    if (customError) {
      console.error('Error fetching custom tasks:', customError);
      return initialTasks;
    }

    // Create a map of completed task IDs
    const completedTaskIds = new Set(
      completedTasksData
        ?.filter(task => task.completed)
        .map(task => task.task_id) || []
    );

    // Convert custom tasks to Task interface
    const customTasks: Task[] = (customTasksData || []).map(task => ({
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description,
      code: task.code,
      difficulty: task.difficulty as 'easy' | 'medium' | 'hard',
      completed: completedTaskIds.has(task.id)
    }));

    // Combine initial and custom tasks
    const allTasks = [...initialTasks, ...customTasks];

    // Mark tasks as completed based on task_history
    return allTasks.map(task => ({
      ...task,
      completed: completedTaskIds.has(task.id)
    }));
  } catch (error) {
    console.error('Error in fetchTasks:', error);
    return initialTasks;
  }
}