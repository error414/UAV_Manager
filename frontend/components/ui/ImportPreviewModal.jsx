import React, { useState, useMemo, useRef } from 'react';
import { Button } from '../index';

// Build the expected telemetry log file name for a CSV record.
// Mirrors the radio-side Lua naming:
//   modelName = string.gsub(modelName, "[^%w_%-]", "_")
//   /LOGS/<modelName>_TeleLog_<YYYY><MM><DD>_<HH><MM><SS>.csv
const buildExpectedLogName = (row) => {
    const modelName =
        row.ModelName || row.drone_name || row.uav_serial || '';
    const dateStr = row.Date || row.departure_date || '';
    const timeStr = row['Timestamp-TO'] || row.departure_time || '';

    if (!modelName || !dateStr || !timeStr) return null;

    // Lua "[^%w_%-]" keeps alphanumerics, underscore and hyphen; JS \w already
    // includes underscore, so [^\w-] is equivalent.
    const sanitized = modelName.replace(/[^\w-]/g, '_');

    const dateParts = dateStr.split('-'); // YYYY-MM-DD
    const timeParts = timeStr.split(':'); // HH:MM:SS
    if (dateParts.length < 3 || timeParts.length < 3) return null;

    const pad = (v, len) => String(v).padStart(len, '0');
    const [y, mo, d] = dateParts;
    const [h, mi, s] = timeParts;

    return `${sanitized}_TeleLog_${pad(y, 4)}${pad(mo, 2)}${pad(d, 2)}_${pad(h, 2)}${pad(mi, 2)}${pad(s, 2)}.csv`;
};

const ImportPreviewModal = ({ show, onClose, onConfirm, csvData, fileName }) => {
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);
    const [step, setStep] = useState('select'); // 'select' | 'match'
    const [matchedFiles, setMatchedFiles] = useState({}); // rowIndex -> { name, file }
    const [directoryAttached, setDirectoryAttached] = useState(false);
    const directoryInputRef = useRef(null);

    // Initialize all rows as selected when data changes
    useMemo(() => {
        if (csvData && csvData.rows) {
            setSelectedRows(new Set(csvData.rows.map((_, index) => index)));
            setSelectAll(true);
            setStep('select');
            setMatchedFiles({});
            setDirectoryAttached(false);
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

    const handleNext = () => {
        // Moving to the matching step invalidates any previous directory pick.
        setMatchedFiles({});
        setDirectoryAttached(false);
        setStep('match');
    };

    const handleAttachDirectoryClick = () => {
        if (directoryInputRef.current) {
            directoryInputRef.current.click();
        }
    };

    const handleDirectorySelect = (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = null;

        // Map every file in the chosen directory by its base name (case-insensitive).
        const fileMap = new Map();
        files.forEach(f => fileMap.set(f.name.toLowerCase(), f));

        const matches = {};
        csvData.rows.forEach((row, index) => {
            if (!selectedRows.has(index)) return;
            const expected = buildExpectedLogName(row);
            if (expected && fileMap.has(expected.toLowerCase())) {
                matches[index] = { name: expected, file: fileMap.get(expected.toLowerCase()) };
            }
        });

        setMatchedFiles(matches);
        setDirectoryAttached(true);
    };

    const handleConfirm = () => {
        const selectedRowsData = csvData.rows.filter((_, index) => selectedRows.has(index));
        // Collect matched log files alongside the rows they belong to.
        const matchedLogFiles = csvData.rows
            .map((row, index) => (selectedRows.has(index) && matchedFiles[index])
                ? { row, ...matchedFiles[index] }
                : null)
            .filter(Boolean);
        onConfirm(selectedRowsData, matchedLogFiles);
    };

    const matchedCount = Object.keys(matchedFiles).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Import Preview: {fileName}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {step === 'select'
                                    ? `Select rows to import (${selectedRows.size} of ${csvData.rows.length} selected)`
                                    : `Attach the directory containing the telemetry logs (${matchedCount} of ${selectedRows.size} matched)`}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-auto flex-grow p-4">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-fixed">
                        {/* Table Header */}
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                            {step === 'select' && (
                                <th className="p-2 pl-3 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleToggleAll}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                </th>
                            )}
                            <th className="p-2 pl-3 w-16 text-center">#</th>
                            {step === 'match' && (
                                <th className="p-2 pl-3" style={{ minWidth: '260px' }}>Log File</th>
                            )}
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
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {csvData.rows.map((row, rowIndex) => {
                            if (step === 'match' && !selectedRows.has(rowIndex)) return null;
                            const match = matchedFiles[rowIndex];
                            return (
                            <tr
                                key={rowIndex}
                                className={`border-b ${step === 'select' ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''} ${
                                    step === 'select' && selectedRows.has(rowIndex) ? 'bg-blue-50' : 'bg-white dark:bg-gray-800'
                                }`}
                                onClick={step === 'select' ? () => handleToggleRow(rowIndex) : undefined}
                            >
                                {step === 'select' && (
                                    <td className="py-2 px-3 text-center w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(rowIndex)}
                                            onChange={() => handleToggleRow(rowIndex)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                )}
                                <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400 w-16">
                                    {rowIndex + 1}
                                </td>
                                {step === 'match' && (
                                    <td className="py-2 px-3 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {!directoryAttached ? (
                                            <span className="text-gray-400">—</span>
                                        ) : match ? (
                                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="truncate" title={match.name}>{match.name}</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not found</span>
                                        )}
                                    </td>
                                )}
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
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Hidden directory picker */}
                <input
                    type="file"
                    ref={directoryInputRef}
                    onChange={handleDirectorySelect}
                    webkitdirectory=""
                    directory=""
                    multiple
                    style={{ display: 'none' }}
                />

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center bg-white dark:bg-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {step === 'select' && selectedRows.size === 0 && (
                            <span className="text-red-600">Please select at least one row to import</span>
                        )}
                        {step === 'match' && directoryAttached && (
                            <span>{matchedCount} of {selectedRows.size} records matched a log file</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step === 'select' ? (
                            <>
                                <Button onClick={onClose} variant="secondary">Cancel</Button>
                                <Button
                                    onClick={handleNext}
                                    variant="primary"
                                    disabled={selectedRows.size === 0}
                                >
                                    Next ({selectedRows.size})
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setStep('select')} variant="secondary">Back</Button>
                                <Button onClick={handleAttachDirectoryClick} variant="warning">
                                    {directoryAttached ? 'Re-attach Directory' : 'Attach Directory'}
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    variant="primary"
                                    disabled={selectedRows.size === 0}
                                >
                                    Import Selected ({selectedRows.size})
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
