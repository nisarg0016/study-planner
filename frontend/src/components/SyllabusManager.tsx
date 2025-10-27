import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface TopicCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent_id?: number | null;
  priority: number;
  is_system: boolean;
  children?: TopicCategory[];
}

interface SyllabusItem {
  id: number;
  subject: string;
  topic: string;
  description: string;
  chapter_number?: number;
  estimated_study_hours?: number;
  completed: boolean;
  completion_percentage: number;
  priority?: string;
  start_date?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  difficulty_level?: number;
  category_id?: number | null;
  category_name?: string | null;
  category_color?: string | null;
  category_priority?: number | null;
  category_icon?: string | null;
  created_at: string;
  updated_at: string;
}

interface NewSyllabusForm {
  subject: string;
  topic: string;
  description: string;
  chapterNumber: number;
  estimatedStudyHours: number;
  priority: string;
  startDate: string;
  targetCompletionDate: string;
  difficultyLevel: number;
  categoryId?: number | null;
}

export const SyllabusManager: React.FC = () => {
  const { user } = useAuth();
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<TopicCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'subjects' | 'stats'>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SyllabusItem | null>(null);

  const [newSyllabus, setNewSyllabus] = useState<NewSyllabusForm>({
    subject: '',
    topic: '',
    description: '',
    chapterNumber: 1,
    estimatedStudyHours: 2,
    priority: 'medium',
    startDate: '',
    targetCompletionDate: '',
    difficultyLevel: 3,
    categoryId: null
  });

  useEffect(() => {
    fetchSyllabusData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/topic-categories');
      setCategories(response.data.categories || []);
      setCategoryTree(response.data.tree || []);
      console.log(response.data.tree);
    } catch (error: any) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchSyllabusData = async () => {
    try {
      setLoading(true);
      console.log('Fetching syllabus data...');
      const [syllabusResponse, subjectsResponse] = await Promise.all([
        api.get('/syllabus'),
        api.get('/syllabus/by-subject')
      ]);
      
      console.log('Syllabus response:', syllabusResponse.data);
      console.log('Subjects response:', subjectsResponse.data);
      
      // Ensure we're setting arrays
      const syllabusData = syllabusResponse.data?.syllabus;
      const subjectsData = subjectsResponse.data?.subjects.rows;
      
      console.log('Processed syllabusData:', syllabusData);
      console.log('Processed subjectsData:', subjectsData);
      
      setSyllabusItems(Array.isArray(syllabusData) ? syllabusData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error: any) {
      console.error('Fetch syllabus error:', error);
      setError(error.response?.data?.message || 'Failed to load syllabus data');
      // Set empty arrays on error
      setSyllabusItems([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createSyllabus = async () => {
    try {
      const response = await api.post('/syllabus', newSyllabus);
      setSyllabusItems(prevItems => [
        response.data.syllabus, 
        ...(Array.isArray(prevItems) ? prevItems : [])
      ]);
      setShowAddForm(false);
      setNewSyllabus({
        subject: '',
        topic: '',
        description: '',
        chapterNumber: 1,
        estimatedStudyHours: 2,
        priority: 'medium',
        startDate: '',
        targetCompletionDate: '',
        difficultyLevel: 3,
        categoryId: null
      });
      fetchSyllabusData(); // Refresh to update subjects
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create syllabus item');
    }
  };

  const updateSyllabus = async (id: number, updates: Partial<SyllabusItem>) => {
    try {
      const response = await api.put(`/syllabus/${id}`, updates);
      setSyllabusItems(prevItems => 
        Array.isArray(prevItems) 
          ? prevItems.map(item => item.id === id ? (response.data.syllabus || item) : item)
          : []
      );
      setEditingItem(null);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update syllabus item');
    }
  };

  const deleteSyllabus = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this syllabus item?')) return;
    
    try {
      await api.delete(`/syllabus/${id}`);
      setSyllabusItems(prevItems => 
        Array.isArray(prevItems) 
          ? prevItems.filter(item => item.id !== id)
          : []
      );
      fetchSyllabusData(); // Refresh to update subjects
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete syllabus item');
    }
  };

  const toggleCompletion = async (item: SyllabusItem) => {
    await updateSyllabus(item.id, { 
      completed: !item.completed,
      completion_percentage: !item.completed ? 100 : 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  function catfilter(syllabusItems: SyllabusItem[]) {
    let idx = 0;
    let children: number[] = [];
    for (let i = 0; i < categoryTree.length; i++) {
      if (categoryTree[i].id == selectedCategory) {
        let ch = categoryTree[i].children;
        if (ch == undefined) ch = [];
        idx = i;
        for (let j = 0; j < (categoryTree[i].children?.length || 0); j++) {
          children[j] = ch[j]?.id;
        }
      }
    }
    return syllabusItems.filter(item => !selectedCategory || item.category_id === selectedCategory || children?.includes(item.category_id === undefined || item.category_id === null ? -1 : item.category_id));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Syllabus Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Syllabus Item
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Items ({syllabusItems.length})
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subjects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              By Subject ({subjects.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
          </nav>
        </div>

        {/* Category Filter Sidebar */}
        {categories.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === null
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Categories
              </button>
              {categories
                .filter(cat => !cat.parent_id)
                .sort((a, b) => b.priority - a.priority)
                .map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 text-sm rounded-full text-white transition-all ${
                      selectedCategory === cat.id ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                    }`}
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
            </div>
            {selectedCategory && categories.find(c => c.id === selectedCategory)?.children && categories.find(c => c.id === selectedCategory)!.children!.length > 0 && (
              <div className="mt-2 pl-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Sub-categories:</span>
                {categories.find(c => c.id === selectedCategory)!.children!.map(subCat => (
                  <button
                    key={subCat.id}
                    onClick={() => setSelectedCategory(subCat.id)}
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: subCat.color }}
                  >
                    {subCat.icon} {subCat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Syllabus Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Syllabus Item</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.subject}
                    onChange={(e) => setNewSyllabus({...newSyllabus, subject: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Topic</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.topic}
                    onChange={(e) => setNewSyllabus({...newSyllabus, topic: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={newSyllabus.description}
                    onChange={(e) => setNewSyllabus({...newSyllabus, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Chapter Number</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.chapterNumber}
                    onChange={(e) => setNewSyllabus({...newSyllabus, chapterNumber: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Study Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.estimatedStudyHours}
                    onChange={(e) => setNewSyllabus({...newSyllabus, estimatedStudyHours: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.startDate}
                    onChange={(e) => setNewSyllabus({...newSyllabus, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Completion Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.targetCompletionDate}
                    onChange={(e) => setNewSyllabus({...newSyllabus, targetCompletionDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Difficulty Level (1-5)</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.difficultyLevel}
                    onChange={(e) => setNewSyllabus({...newSyllabus, difficultyLevel: parseInt(e.target.value)})}
                  >
                    <option value={1}>1 - Very Easy</option>
                    <option value={2}>2 - Easy</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Hard</option>
                    <option value={5}>5 - Very Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.priority}
                    onChange={(e) => setNewSyllabus({...newSyllabus, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newSyllabus.categoryId || ''}
                    onChange={(e) => setNewSyllabus({...newSyllabus, categoryId: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">No Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name} {cat.parent_id ? '(Sub-category)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={createSyllabus}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {
              !Array.isArray(syllabusItems) || syllabusItems.length === 0 ? (
                <li className="px-6 py-8 text-center text-gray-500">
                  No syllabus items yet. Click "Add Syllabus Item" to create your first item.
                </li>
              ) : (
                catfilter(syllabusItems)
                  .filter(item => true)
                  .map((item) => (
                  item && item.id ? (
                  <li key={item.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {item.subject || 'Unknown Subject'} - {item.topic || 'Unknown Topic'}
                            </h3>
                            {item.priority && (
                              <span 
                                className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${
                                  item.priority === 'urgent' ? 'bg-red-500' :
                                  item.priority === 'high' ? 'bg-orange-500' :
                                  item.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                              >
                                {item.priority.toUpperCase()}
                              </span>
                            )}
                            {item.category_name && (
                              <span 
                                className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                                style={{ backgroundColor: item.category_color || '#3B82F6' }}
                              >
                                {item.category_icon} {item.category_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.completed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.completed ? 'Completed' : 'In Progress'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {item.completion_percentage}%
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          {item.chapter_number && <span>Chapter: {item.chapter_number}</span>}
                          {item.estimated_study_hours && <span>Est. Hours: {item.estimated_study_hours}</span>}
                          {item.difficulty_level && <span>Difficulty: {item.difficulty_level}/5</span>}
                          {item.target_completion_date && (
                            <span>Target: {new Date(item.target_completion_date).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${item.completion_percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => toggleCompletion(item)}
                          className={`text-sm font-medium ${
                            item.completed 
                              ? 'text-yellow-600 hover:text-yellow-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {item.completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => deleteSyllabus(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                  ) : null
                ))
              )}
            </ul>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!Array.isArray(subjects) || subjects.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                No subjects available yet.
              </div>
            ) : (
              subjects.map((subject) => (
              <div key={subject.subject} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{subject.subject}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Topics:</span>
                    <span className="font-semibold">{subject.total_topics}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-semibold text-green-600">{subject.completed_topics}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="font-semibold">{(subject.avg_completion || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Hours:</span>
                    <span className="font-semibold">{subject.total_estimated_hours || 0}h</span>
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${subject.avg_completion || 0}%` }}
                  ></div>
                </div>
              </div>
              ))
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Total Topics</h3>
              <p className="text-3xl font-bold text-blue-600">
                {Array.isArray(syllabusItems) ? syllabusItems.length : 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Completed</h3>
              <p className="text-3xl font-bold text-green-600">
                {Array.isArray(syllabusItems) ? syllabusItems.filter(item => item.completed).length : 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Subjects</h3>
              <p className="text-3xl font-bold text-purple-600">
                {Array.isArray(subjects) ? subjects.length : 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Avg Progress</h3>
              <p className="text-3xl font-bold text-orange-600">
                {Array.isArray(syllabusItems) && syllabusItems.length > 0 
                  ? (syllabusItems.reduce((sum, item) => sum + (item.completion_percentage || 0), 0) / syllabusItems.length).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};