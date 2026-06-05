import React, { useState } from 'react';
import { Button } from '../index';

const CompareModal = ({ show, onClose, data }) => {
  const [onlyChanges, setOnlyChanges] = useState(false);

  if (!show || !data) return null;

  const filteredLines = onlyChanges
      ? data.diffLines.filter(diff => diff.type !== 'unchanged')
      : data.diffLines;

  const linesWithSeparators = onlyChanges
      ? filteredLines.reduce((acc, diff, index) => {
        const prevOrigIndex = index === 0 ? -1 : data.diffLines.indexOf(filteredLines[index - 1]);
        const currOrigIndex = data.diffLines.indexOf(diff);
        if (index > 0 && currOrigIndex - prevOrigIndex > 1) {
          acc.push({ type: 'separator' });
        }
        acc.push(diff);
        return acc;
      }, [])
      : filteredLines;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Comparing: {data.file1.name} vs {data.file2.name}
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                    type="checkbox"
                    checked={onlyChanges}
                    onChange={e => setOnlyChanges(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                />
                Show only changes
              </label>
              <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-auto flex-grow p-4">
            <div className="border rounded">
              <div className="grid grid-cols-2 border-b bg-gray-100 dark:bg-gray-700">
                <div className="p-2 font-medium border-r">{data.file1.name}</div>
                <div className="p-2 font-medium">{data.file2.name}</div>
              </div>

              <div className="grid grid-cols-[auto_auto_1fr_auto_auto_1fr]">
                {linesWithSeparators.length === 0 ? (
                    <div className="col-span-6 p-4 text-center text-gray-500 dark:text-gray-400">
                      Files are identical
                    </div>
                ) : (
                    linesWithSeparators.map((diff, index) => (
                        <React.Fragment key={index}>
                          {diff.type === 'separator' ? (
                              <div className="col-span-6 text-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-y text-xs py-0.5 select-none tracking-widest">
                                · · · · · · · · · ·
                              </div>
                          ) : (
                              <>
                                <div className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r bg-gray-50 dark:bg-gray-800 text-right min-w-[2.5rem] select-none">
                                  {diff.lineNumber1 ?? ''}
                                </div>
                                <div className={`px-2 py-1 border-r whitespace-pre-wrap font-mono text-sm ${
                                    diff.type === 'removed' ? 'bg-red-100 dark:bg-red-900/40' :
                                        diff.type === 'changed' ? 'bg-orange-100 dark:bg-orange-900/40' : ''
                                }`}>
                                  {diff.line1 ?? ''}
                                </div>
                                <div className="border-r" />
                                <div className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r bg-gray-50 dark:bg-gray-800 text-right min-w-[2.5rem] select-none">
                                  {diff.lineNumber2 ?? ''}
                                </div>
                                <div className={`px-2 py-1 whitespace-pre-wrap font-mono text-sm ${
                                    diff.type === 'added' ? 'bg-green-100 dark:bg-green-900/40' :
                                        diff.type === 'changed' ? 'bg-orange-100 dark:bg-orange-900/40' : ''
                                }`}>
                                  {diff.line2 ?? ''}
                                </div>
                                <div />
                              </>
                          )}
                        </React.Fragment>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </div>
  );
};

export default CompareModal;