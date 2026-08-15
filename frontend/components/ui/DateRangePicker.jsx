import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

// Calendar-based date range picker used by the table filters.
//
// The popup keeps its own draft state and only calls `onChange` when the user
// actually commits a range (second day click, preset, Apply or Clear). Browsing
// months/years therefore never triggers a data reload, and because the popup is
// rendered in a portal it also survives re-renders of the surrounding table.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Local-time ISO date (toISOString() would shift the day for negative offsets)
const toISO = (date) => {
  if (!date) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseISO = (value) => {
  if (!value || !ISO_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects overflowing values such as 2025-02-31
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1);

// 6 fixed weeks (Monday first) so the popup height never jumps between months
const buildMonthGrid = (year, month) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
};

const buildPresets = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const shift = (days) => new Date(y, m, today.getDate() + days);

  return [
    { label: 'Today', range: [toISO(today), toISO(today)] },
    { label: 'Yesterday', range: [toISO(shift(-1)), toISO(shift(-1))] },
    { label: 'Last 7 days', range: [toISO(shift(-6)), toISO(today)] },
    { label: 'Last 30 days', range: [toISO(shift(-29)), toISO(today)] },
    { label: 'This month', range: [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))] },
    { label: 'Last month', range: [toISO(new Date(y, m - 1, 1)), toISO(new Date(y, m, 0))] },
    { label: 'This year', range: [toISO(new Date(y, 0, 1)), toISO(new Date(y, 11, 31))] },
    { label: 'Last year', range: [toISO(new Date(y - 1, 0, 1)), toISO(new Date(y - 1, 11, 31))] }
  ];
};

const DateRangePicker = ({
  from = '',
  to = '',
  onChange,
  placeholder = 'Any date',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const [text, setText] = useState({ from, to });
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(from) || new Date()));
  const [hovered, setHovered] = useState('');
  const [position, setPosition] = useState(null);
  const [narrow, setNarrow] = useState(false);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const presets = useMemo(buildPresets, []);
  const todayISO = useMemo(() => toISO(new Date()), []);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set();
    for (let y = current - 15; y <= current + 5; y++) years.add(y);
    [from, to, draft.from, draft.to].forEach((value) => {
      const parsed = parseISO(value);
      if (parsed) years.add(parsed.getFullYear());
    });
    years.add(viewMonth.getFullYear());
    return [...years].sort((a, b) => a - b);
  }, [from, to, draft.from, draft.to, viewMonth]);

  // Keep the draft in sync while closed (e.g. filters restored from the URL)
  useEffect(() => {
    if (!open) {
      setDraft({ from, to });
      setText({ from, to });
    }
  }, [from, to, open]);

  const openPicker = useCallback(() => {
    setDraft({ from, to });
    setText({ from, to });
    setViewMonth(startOfMonth(parseISO(from) || parseISO(to) || new Date()));
    setHovered('');
    setNarrow(typeof window !== 'undefined' && window.innerWidth < 700);
    setPosition(null);
    setOpen(true);
  }, [from, to]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setHovered('');
  }, []);

  const commit = useCallback((nextFrom, nextTo) => {
    const cleanFrom = nextFrom || '';
    const cleanTo = nextTo || '';
    closePicker();
    if (cleanFrom !== from || cleanTo !== to) {
      onChange({ from: cleanFrom, to: cleanTo });
    }
  }, [from, to, onChange, closePicker]);

  const handleDayClick = useCallback((iso) => {
    setHovered('');
    // No start yet, or a complete range already picked -> start a new range
    if (!draft.from || draft.to) {
      setDraft({ from: iso, to: '' });
      return;
    }
    // Clicking before the start moves the start instead of inverting the range
    if (iso < draft.from) {
      setDraft({ from: iso, to: '' });
      return;
    }
    commit(draft.from, iso);
  }, [draft, commit]);

  const handleTextChange = useCallback((key, value) => {
    setText((prev) => ({ ...prev, [key]: value }));
    if (value === '') {
      setDraft((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const parsed = parseISO(value);
    if (parsed) {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        // An inverted range restarts the selection at the edited date
        return next.from && next.to && next.from > next.to ? { from: value, to: '' } : next;
      });
      setViewMonth(startOfMonth(parsed));
    }
  }, []);

  // --- popup placement -------------------------------------------------
  const updatePosition = useCallback(() => {
    if (narrow) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const { offsetWidth: width, offsetHeight: height } = panel;

    let left = Math.min(rect.left, window.innerWidth - width - margin);
    left = Math.max(margin, left);

    let top = rect.bottom + 4;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - height - 4;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }

    setPosition({ top, left });
  }, [narrow]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || narrow) return undefined;
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, narrow, updatePosition]);

  // --- outside click / escape ------------------------------------------
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      closePicker();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePicker();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, closePicker]);

  // --- rendering --------------------------------------------------------
  const rangeEnd = draft.to || (draft.from && hovered > draft.from ? hovered : '');

  const renderMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    return (
      <div className="w-[15.5rem]">
        <div className="mb-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
          {MONTHS[month]} {year}
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
          {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {buildMonthGrid(year, month).map((date) => {
            const iso = toISO(date);
            // Days from adjacent months stay blank: with two months side by
            // side they would otherwise show up twice.
            if (date.getMonth() !== month) return <div key={iso} className="h-7" />;

            const isStart = iso === draft.from;
            const isEnd = iso === draft.to;
            const inRange = draft.from && rangeEnd && iso > draft.from && iso < rangeEnd;
            const isEdge = isStart || isEnd || (iso === rangeEnd && !!draft.from);

            let cellClass = 'text-gray-700 dark:text-gray-200';
            if (inRange) cellClass = 'bg-blue-100 dark:bg-blue-900/50 text-gray-800 dark:text-gray-100';
            if (isEdge) cellClass = 'bg-blue-600 text-white font-semibold';

            return (
              <button
                key={iso}
                type="button"
                aria-label={iso}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => setHovered(iso)}
                className={`h-7 w-full cursor-pointer rounded text-xs leading-7 hover:bg-blue-500 hover:text-white ${cellClass} ${
                  iso === todayISO && !isEdge ? 'ring-1 ring-inset ring-blue-400' : ''
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const panel = (
    <div
      ref={panelRef}
      className="w-max max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800"
      onMouseLeave={() => setHovered('')}
    >
      {/* From / To text inputs */}
      <div className="mb-2 flex items-center gap-2">
        {['from', 'to'].map((key) => (
          <div key={key} className="flex flex-1 flex-col">
            <label className="mb-0.5 text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
              {key === 'from' ? 'From' : 'To'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD"
              value={text[key]}
              onChange={(e) => handleTextChange(key, e.target.value)}
              onBlur={() => setText((prev) => ({ ...prev, [key]: draft[key] }))}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {/* Presets */}
        <div className={`${narrow ? 'hidden' : 'flex'} w-32 flex-col gap-0.5 border-r border-gray-200 pr-3 dark:border-gray-700`}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => commit(preset.range[0], preset.range[1])}
              className="cursor-pointer rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-blue-300"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div>
          {/* Month / year navigation */}
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMonth((prev) => addMonths(prev, -1))}
              aria-label="Previous month"
              className="cursor-pointer rounded px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            <select
              value={viewMonth.getMonth()}
              onChange={(e) => setViewMonth((prev) => new Date(prev.getFullYear(), Number(e.target.value), 1))}
              className="flex-1 rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
            <select
              value={viewMonth.getFullYear()}
              onChange={(e) => setViewMonth((prev) => new Date(Number(e.target.value), prev.getMonth(), 1))}
              className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
              aria-label="Next month"
              className="cursor-pointer rounded px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ›
            </button>
          </div>

          <div className="flex gap-4">
            {renderMonth(viewMonth)}
            {!narrow && renderMonth(addMonths(viewMonth, 1))}
          </div>

          {narrow && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-gray-200 pt-2 dark:border-gray-700">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => commit(preset.range[0], preset.range[1])}
                  className="cursor-pointer rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-blue-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {draft.from || draft.to
            ? `${draft.from || '…'} → ${draft.to || '…'}`
            : 'Pick a start and an end date'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => commit('', '')}
            className="cursor-pointer rounded px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={closePicker}
            className="cursor-pointer rounded px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => commit(draft.from, draft.to)}
            className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  const hasValue = Boolean(from || to);

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? closePicker() : openPicker())}
          className="w-full cursor-pointer rounded border border-gray-300 px-2 py-1 text-left text-xs leading-tight dark:border-gray-600"
        >
          {hasValue ? (
            <span className="block truncate">
              <span className="block truncate text-gray-800 dark:text-gray-100">{from || 'Any'}</span>
              <span className="block truncate text-gray-800 dark:text-gray-100">{to || 'Any'}</span>
            </span>
          ) : (
            <span className="block truncate text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </button>
        {hasValue && (
          <button
            type="button"
            aria-label="Clear date range"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: '', to: '' });
            }}
            className="absolute right-1 top-1 cursor-pointer rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>

      {open && createPortal(
        narrow ? (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-2">
            {panel}
          </div>
        ) : (
          <div
            className="fixed z-[1100]"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? 'visible' : 'hidden'
            }}
          >
            {panel}
          </div>
        ),
        document.body
      )}
    </>
  );
};

export default DateRangePicker;
