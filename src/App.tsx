import React, { useState, useEffect } from 'react';
import { Layout, Settings, Play, Trash2, Plus, MessageSquare, X, CheckCircle, Circle, LogOut } from 'lucide-react';
import { generateCodeCompletion, runCode, generateMilestone, checkTaskCompletion } from './lib/openai';
import { supabase, saveCompletedTask, loadUserState, saveUserState, saveCustomTask } from './lib/supabase';
import { Task, fetchTasks } from './lib/tasks';
import { Login } from './pages/Login';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Settings {
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
}

interface DocumentationEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  tasks_completed: number;
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [code, setCode] = useState<string>('# Start coding here\nprint("Hello, Developer!")');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<'code' | 'tasks'>('code');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    fontSize: 'medium'
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your Python learning assistant. How can I help you today?' }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [documentationEntries, setDocumentationEntries] = useState<DocumentationEntry[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeUserState();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        initializeUserState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (pendingTasks.length > 0 && !selectedTask) {
      const firstTask = pendingTasks[0];
      setSelectedTask(firstTask);
      setCode(`# ${firstTask.description}\n\n# Write your solution here:`);
      setOutput('');
      setError('');
    }
  }, [pendingTasks, selectedTask]);

  const initializeUserState = async () => {
    try {
      const state = await loadUserState();
      if (state) {
        if (state.settings) {
          setSettings(state.settings);
        }
        if (state.last_code) {
          setCode(state.last_code);
        }
      }
      
      const tasks = await fetchTasks();
      setPendingTasks(tasks.filter(t => !t.completed));
      setCompletedTasks(tasks.filter(t => t.completed));
      
      await loadDocumentation();
    } catch (err) {
      console.error('Error initializing user state:', err);
      setError('Failed to load your saved progress. Please try again.');
    }
  };

  const loadDocumentation = async () => {
    const { data } = await supabase
      .from('documentation_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setDocumentationEntries(data);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    saveUserState(settings, newCode);
  };

  const handleSettingsChange = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('devspace-settings', JSON.stringify(newSettings));
    saveUserState(newSettings, code);
  };

  const handleRunCode = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await runCode(code);
      setOutput(result);
      
      if (selectedTask) {
        const isCompleted = await checkTaskCompletion(code, result, selectedTask);
        if (isCompleted) {
          await saveCompletedTask(selectedTask);
          const updatedTask = { ...selectedTask, completed: true };
          setCompletedTasks(prev => [...prev, updatedTask]);
          setPendingTasks(prev => {
            const updatedTasks = prev.filter(t => t.id !== selectedTask.id);
            const currentIndex = prev.findIndex(t => t.id === selectedTask.id);
            const nextTask = prev[currentIndex + 1] || null;
            
            if (nextTask) {
              setSelectedTask(nextTask);
              setCode(`# ${nextTask.description}\n\n# Write your solution here:`);
              setOutput('');
            } else {
              setSelectedTask(null);
            }
            
            return updatedTasks;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCode = () => {
    if (selectedTask) {
      setCode(`# ${selectedTask.description}\n\n# Write your solution here:`);
    } else {
      setCode('# Start coding here');
    }
    setOutput('');
    setError('');
  };

  const toggleView = () => {
    setView(view === 'code' ? 'tasks' : 'code');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCode('# Start coding here\nprint("Hello, Developer!")');
    setPendingTasks([]);
    setCompletedTasks([]);
    setDocumentationEntries([]);
    setSelectedTask(null);
  };

  const loadTaskCode = (task: Task) => {
    setSelectedTask(task);
    setCode(`# ${task.description}\n\n# Write your solution here:`);
    setOutput('');
    setError('');
    if (view === 'tasks') {
      setView('code');
    }
  };

  const handleSolveTask = (task: Task) => {
    setSelectedTask(task);
    setCode(`# ${task.description}\n${task.code}`);
    setOutput('');
    setError('');
    if (view === 'tasks') {
      setView('code');
    }
  };

  const handleAddTask = async () => {
    setIsLoading(true);
    try {
      const newTaskDescription = await generateMilestone();
      const categories = ['Basics', 'Variables', 'Functions', 'Loops', 'Lists', 'Strings', 'Math'];
      const difficulties = ['easy', 'medium', 'hard'] as const;
      
      const task = {
        title: 'Custom Task',
        description: newTaskDescription,
        code: '# Write your solution here',
        category: categories[Math.floor(Math.random() * categories.length)],
        difficulty: difficulties[Math.floor(Math.random() * difficulties.length)]
      };

      const savedTask = await saveCustomTask(task);
      if (savedTask) {
        setPendingTasks(prev => [...prev, savedTask]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user' as const, content: currentMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');

    try {
      const response = await generateCodeCompletion(currentMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
  };

  const formatOutput = (text: string) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const wordsPerLine = 15;

    words.forEach((word, index) => {
      if (index > 0 && index % wordsPerLine === 0) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += word + ' ';
    });
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'bg-[#1e1e1e] text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`${settings.theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} h-16 fixed top-0 w-full flex items-center justify-between px-6 shadow-lg z-10`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 relative">
            <svg viewBox="0 0 256 255" className="w-full h-full">
              <path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z" fill="#FFD43B"/>
              <path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z" fill="#3776AB"/>
            </svg>
          </div>
          <span className="text-xl font-semibold">PyZone</span>
          <span className="text-sm text-gray-400 ml-4">{user.email}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            className="px-4 py-2 bg-[#3776AB] rounded-md hover:bg-[#2B5B8A] transition-colors flex items-center space-x-2"
            onClick={toggleView}
          >
            <Layout className="w-4 h-4" />
            <span>{view === 'code' ? 'View Tasks' : 'View Code'}</span>
          </button>
          <button 
            className={`p-2 hover:bg-[#3d3d3d] rounded-full transition-colors ${isChatOpen ? 'bg-[#3d3d3d]' : ''}`}
            onClick={toggleChat}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <button 
            className={`p-2 hover:bg-[#3d3d3d] rounded-full transition-colors ${showSettings ? 'bg-[#3d3d3d]' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-6 h-6" />
          </button>
          <button 
            className="p-2 hover:bg-[#3d3d3d] rounded-full transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="pt-16 flex h-screen">
        {view === 'code' ? (
          <div className="flex-1 bg-[#252525] p-6">
            <div className="bg-[#1e1e1e] rounded-lg h-full p-4 font-mono text-sm flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Python Editor</h2>
                <div className="space-x-2">
                  <button 
                    className="px-4 py-2 bg-[#FFD43B] text-[#2B5B8A] font-semibold rounded-md hover:bg-[#FFE873] transition-colors flex items-center space-x-2"
                    onClick={handleRunCode}
                    disabled={isLoading}
                  >
                    <Play className="w-4 h-4" />
                    <span>{isLoading ? 'Running...' : 'Run Code'}</span>
                  </button>
                  <button 
                    className="px-4 py-2 bg-[#3776AB] text-white rounded-md hover:bg-[#2B5B8A] transition-colors flex items-center space-x-2"
                    onClick={handleClearCode}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col space-y-4">
                <textarea
                  value={code}
                  onChange={handleCodeChange}
                  className={`flex-1 bg-[#1a1a1a] rounded-md p-4 border border-[#333] text-gray-300 resize-none focus:outline-none focus:border-[#FFD43B] ${
                    settings.fontSize === 'small' ? 'text-sm' :
                    settings.fontSize === 'medium' ? 'text-base' :
                    'text-lg'
                  }`}
                  spellCheck="false"
                />
                {(output || error) && (
                  <div className="h-1/3 bg-[#1a1a1a] rounded-md p-4 border border-[#333] overflow-auto">
                    <h3 className="text-sm font-semibold mb-2">Output:</h3>
                    <pre className={`text-sm ${error ? 'text-red-400' : 'text-gray-300'} whitespace-pre-wrap break-words`}>
                      {error || formatOutput(output)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-[#252525] p-6">
            <div className="bg-[#1e1e1e] rounded-lg h-full p-4 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Python Learning Tasks</h2>
                <div className="flex space-x-2">
                  {documentationEntries.length > 0 && (
                    <a
                      href={`/documentation/${documentationEntries[0].id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#3776AB] text-white rounded-md hover:bg-[#2B5B8A] transition-colors"
                    >
                      View Progress
                    </a>
                  )}
                  <button
                    className="px-4 py-2 bg-[#FFD43B] text-[#2B5B8A] font-semibold rounded-md hover:bg-[#FFE873] transition-colors flex items-center space-x-2"
                    onClick={handleAddTask}
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#FFD43B]">Pending Tasks</h3>
                    <div className="space-y-3">
                      {pendingTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-[#2d2d2d] p-4 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => loadTaskCode(task)}
                                className="text-gray-400 hover:text-[#FFD43B] transition-colors"
                              >
                                <Circle className="w-5 h-5" />
                              </button>
                              <div>
                                <h4 className="font-medium">{task.title}</h4>
                                <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                <span className="text-xs text-[#3776AB] mt-1">{task.category} · {task.difficulty}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSolveTask(task)}
                                className="px-3 py-1 bg-[#3776AB] rounded hover:bg-[#2B5B8A] transition-colors text-sm"
                              >
                                Solve
                              </button>
                              <button
                                onClick={() => loadTaskCode(task)}
                                className="px-3 py-1 bg-[#FFD43B] text-[#2B5B8A] font-semibold rounded hover:bg-[#FFE873] transition-colors text-sm"
                              >
                                Try
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3776AB]">Completed Tasks</h3>
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-[#2d2d2d] p-4 rounded-lg opacity-75"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <CheckCircle className="w-5 h-5 text-[#FFD43B]" />
                              <div>
                                <h4 className="font-medium line-through">{task.title}</h4>
                                <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                <span className="text-xs text-[#3776AB] mt-1">{task.category} · {task.difficulty}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSolveTask(task)}
                              className="px-3 py-1 bg-[#3776AB] rounded hover:bg-[#2B5B8A] transition-colors text-sm opacity-75"
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-80 bg-[#2d2d2d] p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-6">Resources</h2>
          <div className="space-y-4">
            <div className="bg-[#333] p-4 rounded-lg">
              <h3 className="font-medium mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://docs.python.org/3/" target="_blank" rel="noopener noreferrer" className="text-[#FFD43B] hover:text-[#FFE873] transition-colors">Python Documentation</a>
                </li>
                <li>
                  <a href="https://www.w3schools.com/python/" target="_blank" rel="noopener noreferrer" className="text-[#FFD43B] hover:text-[#FFE873] transition-colors">Python Tutorial</a>
                </li>
                <li>
                  <a href="https://realpython.com/" target="_blank" rel="noopener noreferrer" className="text-[#FFD43B] hover:text-[#FFE873] transition-colors">Real Python</a>
                </li>
              </ul>
            </div>
            <div className="bg-[#333] p-4 rounded-lg">
              <h3 className="font-medium mb-3">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Completed:</span>
                  <span className="font-bold text-[#FFD43B]">
                    {completedTasks.length} / {completedTasks.length + pendingTasks.length}
                  </span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                  <div
                    className="bg-[#3776AB] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(completedTasks.length / (completedTasks.length + pendingTasks.length)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${settings.theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-lg w-96 p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="hover:bg-[#444] p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Theme</h3>
                <select 
                  value={settings.theme}
                  onChange={(e) => handleSettingsChange('theme', e.target.value as 'dark' | 'light')}
                  className={`w-full ${settings.theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFD43B]`}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Font Size</h3>
                <select 
                  value={settings.fontSize}
                  onChange={(e) => handleSettingsChange('fontSize', e.target.value as 'small' | 'medium' | 'large')}
                  className={`w-full ${settings.theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFD43B]`}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-[#3776AB] text-white py-2 rounded-lg hover:bg-[#2B5B8A] transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <div className={`fixed bottom-4 right-4 w-96 h-[500px] ${settings.theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-lg shadow-xl flex flex-col`}>
          <div className="p-4 border-b border-[#444] flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-[#FFD43B]" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <button
              onClick={toggleChat}
              className="hover:bg-[#444] p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-[#3776AB] text-white'
                      : 'bg-[#333] text-gray-200'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[#444]">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 bg-[#1a1a1a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FFD43B]"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#3776AB] text-white px-4 py-2 rounded-lg hover:bg-[#2B5B8A] transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;