import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Test {
  id: number;
  title: string;
  description?: string;
  task_title?: string | null;
}

interface Question {
  id: number;
  prompt: string;
  points: number;
  choices?: Array<{ id: number; text: string }>;
}

const TestTaker: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tests');
      setTests(res.data.tests || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const openTest = async (test: Test) => {
    try {
      setSelectedTest(test);
      setLoading(true);
      const res = await api.get(`/tests/${test.id}/questions`);
      setQuestions(res.data.questions || []);
      setAnswers({});
      setResult(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const selectChoice = (questionId: number, choiceId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }));
  };

  const submit = async () => {
    if (!selectedTest) return;
    const payload = { answers: Object.entries(answers).map(([qId, choiceId]) => ({ question_id: parseInt(qId), choice_id: choiceId })) };
    try {
      setLoading(true);
      const res = await api.post(`/tests/${selectedTest.id}/submit`, payload);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit answers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {!selectedTest && (
        <div>
          {tests.length === 0 ? (
            <div>No tests available.</div>
          ) : (
            <div className="space-y-3">
              {tests.map(t => (
                <div key={t.id} className="p-4 border rounded-md bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{t.title}</h3>
                      <p className="text-sm text-gray-600">{t.description}</p>
                      {t.task_title && <p className="text-sm text-gray-500 mt-1">Related task: {t.task_title}</p>}
                    </div>
                    <button onClick={() => openTest(t)} className="px-3 py-1 bg-blue-600 text-white rounded">Take</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTest && (
        <div>
          <button onClick={() => setSelectedTest(null)} className="mb-4 text-sm text-blue-600">Back to tests</button>
          <h2 className="text-xl font-semibold mb-2">{selectedTest.title}</h2>
          <div className="space-y-4">
            {questions.map(q => (
              <div key={q.id} className="p-4 border rounded bg-white">
                <div className="font-medium">{q.prompt}</div>
                <div className="mt-2 space-y-2">
                  {(q.choices || []).map(c => (
                    <label key={c.id} className={`block p-2 border rounded ${answers[q.id] === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === c.id} onChange={() => selectChoice(q.id, c.id)} className="mr-2" />
                      {c.text}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex space-x-3">
            <button onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded">Submit Answers</button>
            <button onClick={() => { setSelectedTest(null); setQuestions([]); setAnswers({}); setResult(null); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-white border rounded">
              <div className="font-semibold">Result</div>
              <div>Score: {result.score} / {result.total}</div>
              <div>Percentage: {result.percentage}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestTaker;
