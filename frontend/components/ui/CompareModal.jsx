import React from 'react';
import { Button } from '../index';

/**
 * Modal component for comparing two files side by side
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Function to call when the modal is closed
 * @param {Object} data - Comparison data containing file information and diff lines
 * @param {Object} data.file1 - First file information with name and content
 * @param {Object} data.file2 - Second file information with name and content
 * @param {Array} data.diffLines - Array of line differences with type, line1, line2, and lineNumber
 */
const CompareModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Comparing: {data.file1.name} vs {data.file2.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-auto flex-grow p-4">
          <div className="border rounded">
            <div className="grid grid-cols-2 border-b bg-gray-100">
              <div className="p-2 font-medium border-r">{data.file1.name}</div>
              <div className="p-2 font-medium">{data.file2.name}</div>
            </div>
            
            <div className="grid grid-cols-[auto_1fr_1fr]">
              {data.diffLines.map((diff, index) => (
                <React.Fragment key={index}>
                  <div className="px-2 py-1 text-gray-500 border-r bg-gray-50 text-right">
                    {diff.lineNumber}
                  </div>
                  <div className={`px-2 py-1 border-r whitespace-pre-wrap ${
                    diff.type === 'removed' ? 'bg-red-100' :
                    diff.type === 'changed' ? 'bg-orange-100' : ''
                  }`}>
                    {diff.line1 ?? ''}
                  </div>
                  <div className={`px-2 py-1 whitespace-pre-wrap ${
                    diff.type === 'added' ? 'bg-green-100' :
                    diff.type === 'changed' ? 'bg-orange-100' : ''
                  }`}>
                    {diff.line2 ?? ''}
                  </div>
                </React.Fragment>
              ))}
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
