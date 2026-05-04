import { useState } from 'react';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import tntLogoUrl from './assets/tnt-logo.svg';
import { generateQuestions, type GeneratedQuestions, type Question } from './generators/questionGenerator';

type Mode = 'input' | 'output';
type QuestionType = 'closed' | 'tag' | 'open';

const QUESTION_TYPES: { id: QuestionType; label: string; description: string }[] = [
  { id: 'closed', label: 'Closed (yes/no)', description: 'Did Charles love Di for 10 years?' },
  { id: 'tag',    label: 'Tag',             description: 'Charles loved Di, didn\'t they?' },
  { id: 'open',   label: 'Open (wh-)',       description: 'Who loved Di for 10 years?' },
];

const EXAMPLES = [
  'Charles loved Di for 10 years.',
  'She can swim very well.',
  'The students are studying in the library.',
  'John has finished his homework.',
  'They moved to Tokyo last year.',
  'The cat is sleeping on the sofa.',
  'He bought a new car last week.',
  'We will meet at the station tomorrow.',
];

const TYPE_COLOURS: Record<QuestionType, { bg: string; border: string; badge: string; badgeText: string }> = {
  closed: { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100',   badgeText: 'text-blue-800' },
  tag:    { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100', badgeText: 'text-purple-800' },
  open:   { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100',  badgeText: 'text-green-800' },
};

const TYPE_HEADING: Record<QuestionType, string> = {
  closed: 'Closed Questions (Yes / No)',
  tag:    'Tag Questions',
  open:   'Open Questions (Wh-)',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

function QuestionCard({ q, type }: { q: Question; type: QuestionType }) {
  const c = TYPE_COLOURS[type];
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg px-4 py-3 flex items-start justify-between gap-2`}>
      <div className="min-w-0">
        <p className="text-gray-900 font-medium text-base">{q.text}</p>
        <p className="text-xs text-gray-500 mt-0.5 italic">{q.label}</p>
      </div>
      <CopyButton text={q.text} />
    </div>
  );
}

function QuestionSection({ type, questions }: { type: QuestionType; questions: Question[] }) {
  const c = TYPE_COLOURS[type];
  if (!questions.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${c.badge} ${c.badgeText}`}>
          {TYPE_HEADING[type]}
        </span>
        <span className="text-xs text-gray-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => <QuestionCard key={i} q={q} type={type} />)}
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('input');
  const [sentence, setSentence] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<QuestionType>>(new Set(['closed', 'tag', 'open']));
  const [results, setResults] = useState<GeneratedQuestions | null>(null);
  const [lastSentence, setLastSentence] = useState('');

  const toggleType = (id: QuestionType) =>
    setActiveTypes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleGenerate = () => {
    if (!sentence.trim()) return;
    const questions = generateQuestions(sentence.trim());
    setResults(questions);
    setLastSentence(sentence.trim());
    setMode('output');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Input screen ────────────────────────────────────────────────────────────
  if (mode === 'input') {
    return (
      <div className="min-h-full flex items-start justify-center bg-gray-50 p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5 sm:p-8 my-4">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <img src={tntLogoUrl} alt="TNT Lab" className="w-11 h-11 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold leading-tight text-gray-900">Question Generator</h1>
              <p className="text-sm text-gray-500">
                Practice forming questions from declarative sentences
              </p>
            </div>
          </div>

          {/* Question type selector */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Question types to generate
            </p>
            <div className="flex gap-2 flex-wrap">
              {QUESTION_TYPES.map(({ id, label, description }) => {
                const active = activeTypes.has(id);
                const c = TYPE_COLOURS[id];
                return (
                  <button
                    key={id}
                    onClick={() => toggleType(id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      active
                        ? `${c.bg} ${c.border} ${c.badgeText}`
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                    title={description}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sentence input */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Enter a declarative sentence
            </label>
            <input
              type="text"
              value={sentence}
              onChange={e => setSentence(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Charles loved Di for 10 years."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            />
            <p className="text-xs text-gray-400 mt-1">Press Enter or click the button to generate.</p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!sentence.trim() || activeTypes.size === 0}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-base"
          >
            Generate Questions
          </button>

          {/* Example sentences */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setSentence(ex)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
              <div className="pl-2 py-1 border-l-2 border-blue-400">
                <p className="font-semibold text-gray-800 mb-0.5">Closed (yes/no)</p>
                <p>Auxiliary or do-support is moved to the front of the sentence.</p>
              </div>
              <div className="pl-2 py-1 border-l-2 border-purple-400">
                <p className="font-semibold text-gray-800 mb-0.5">Tag questions</p>
                <p>A short tail is added using the auxiliary and a subject pronoun.</p>
              </div>
              <div className="pl-2 py-1 border-l-2 border-green-400">
                <p className="font-semibold text-gray-800 mb-0.5">Open (wh-)</p>
                <p>A wh-word replaces each major constituent: subject, object, and modifiers.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            John Blake, Aston University. Version 2.0.
          </div>
        </div>
      </div>
    );
  }

  // ── Output screen ───────────────────────────────────────────────────────────
  const hasResults = results &&
    (results.closed.length + results.tag.length + results.open.length > 0);

  return (
    <div className="min-h-full flex items-start justify-center bg-gray-50 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-5 sm:p-8 my-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <img src={tntLogoUrl} alt="TNT Lab" className="w-9 h-9 shrink-0" />
            <h1 className="text-xl font-bold text-gray-900">Question Generator</h1>
          </div>
          <button
            onClick={() => setMode('input')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition shrink-0"
          >
            <ArrowLeft size={14} />
            New sentence
          </button>
        </div>

        {/* Input sentence display */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-1">Input sentence</p>
          <p className="text-gray-800 font-serif text-base italic">&ldquo;{lastSentence}&rdquo;</p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <span className="text-xs text-gray-400">Show:</span>
          {QUESTION_TYPES.map(({ id, label }) => {
            const active = activeTypes.has(id);
            const c = TYPE_COLOURS[id];
            return (
              <button
                key={id}
                onClick={() => toggleType(id)}
                className={`px-2 py-1 rounded border text-xs font-medium transition ${
                  active ? `${c.bg} ${c.border} ${c.badgeText}` : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {!hasResults ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>No questions could be generated for this sentence.</p>
            <p className="text-xs mt-1">Make sure the sentence is a complete declarative sentence with a subject and verb.</p>
          </div>
        ) : (
          <>
            {activeTypes.has('closed') && results && (
              <QuestionSection type="closed" questions={results.closed} />
            )}
            {activeTypes.has('tag') && results && (
              <QuestionSection type="tag" questions={results.tag} />
            )}
            {activeTypes.has('open') && results && (
              <QuestionSection type="open" questions={results.open} />
            )}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          John Blake, Aston University. Version 2.0.
        </div>
      </div>
    </div>
  );
}
