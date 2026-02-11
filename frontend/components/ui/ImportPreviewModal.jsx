import React, { useState, useMemo } from 'react';
import { Button } from '../index';

const ImportPreviewModal = ({ show, onClose, onConfirm, csvData, fileName }) => {
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);

    // Initialize all rows as selected when data changes
    useMemo(() => {
        if (csvData && csvData.rows) {
            setSelectedRows(new Set(csvData.rows.map((_, index) => index)));
            setSelectAll(true);
        }
    }, [csvData]);

    if (!show || !csvData) return null;

    const handleToggleRow = (index) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            setSelectAll(newSet.size === csvData.rows.length);
            return newSet;
        });
    };

    const handleToggleAll = () => {
        if (selectAll) {
            setSelectedRows(new Set());
            setSelectAll(false);
        } else {
            setSelectedRows(new Set(csvData.rows.map((_, index) => index)));
            setSelectAll(true);
        }
    };

    const handleConfirm = () => {
        const selectedRowsData = csvData.rows.filter((_, index) => selectedRows.has(index));
        onConfirm(selectedRowsData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Import Preview: {fileName}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Select rows to import ({selectedRows.size} of {csvData.rows.length} selected)
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-auto flex-grow p-4">
                    <table className="w-full text-sm text-left text-gray-500 table-fixed">
                        {/* Table Header */}
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 pl-3 w-12 text-center">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleToggleAll}
                                    className="w-4 h-4 cursor-pointer"
                                />
                            </th>
                            <th className="p-2 pl-3 w-16 text-center">#</th>
                            {csvData.headers.map((header, index) => (
                                <th
                                    key={index}
                                    className="p-2 pl-3 overflow-hidden text-ellipsis whitespace-nowrap"
                                    style={{ minWidth: '120px' }}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody className="divide-y divide-gray-200">
                        {csvData.rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`border-b hover:bg-gray-50 cursor-pointer ${
                                    selectedRows.has(rowIndex) ? 'bg-blue-50' : 'bg-white'
                                }`}
                                onClick={() => handleToggleRow(rowIndex)}
                            >
                                <td className="py-2 px-3 text-center w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(rowIndex)}
                                        onChange={() => handleToggleRow(rowIndex)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                </td>
                                <td className="py-2 px-3 text-center text-gray-500 w-16">
                                    {rowIndex + 1}
                                </td>
                                {csvData.headers.map((header, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className="py-2 px-3 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >
                                        <div className="truncate">
                                            {row[header] || '-'}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center bg-white">
                    <div className="text-sm text-gray-600">
                        {selectedRows.size === 0 && (
                            <span className="text-red-600">Please select at least one row to import</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button
                            onClick={handleConfirm}
                            variant="primary"
                            disabled={selectedRows.size === 0}
                        >
                            Import Selected ({selectedRows.size})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
