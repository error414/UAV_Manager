import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea,
} from 'recharts';

const MAX_POINTS = 3000;
const X_KEY = 'time (us)';
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

const isNumericColumn = (rows, col) => {
  const sample = rows.slice(0, 20);
  return sample.some(row => {
    const v = parseFloat(row[col]);
    return !isNaN(v) && isFinite(v);
  });
};

const getOriginalFilename = blackboxLog =>
  blackboxLog.split('/').pop().replace(/\.csv$/, '.txt');

const downloadWithAuth = async (url, filename) => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const BlackboxChart = ({ blackboxLog, apiUrl }) => {
  const [open, setOpen] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectValue, setSelectValue] = useState('');

  // Zoom state
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [xDomain, setXDomain] = useState(['auto', 'auto']);
  const [yDomain, setYDomain] = useState(['auto', 'auto']);

  const isZoomed = xDomain[0] !== 'auto';

  useEffect(() => {
    if (!open || !blackboxLog) return;
    if (chartData) return;

    setLoading(true);
    setError(null);

    Papa.parse(`${apiUrl}/media/${blackboxLog}`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: ({ data, meta }) => {
        const numericCols = (meta.fields || []).filter(
          col => col !== X_KEY && isNumericColumn(data, col)
        );

        const step = data.length > MAX_POINTS ? Math.ceil(data.length / MAX_POINTS) : 1;
        const sampled = data.filter((_, i) => i % step === 0);

        const parsed = sampled.map(row => {
          const point = { [X_KEY]: parseFloat(row[X_KEY]) / 1_000_000 };
          numericCols.forEach(col => {
            const v = parseFloat(row[col]);
            point[col] = isNaN(v) || !isFinite(v) ? null : v;
          });
          return point;
        });

        setChartData(parsed);
        setColumns(numericCols);
        setLoading(false);
      },
      error: err => {
        setError(err.message || 'Failed to load blackbox CSV');
        setLoading(false);
      },
    });
  }, [open, blackboxLog, apiUrl, chartData]);

  const addColumn = col => {
    if (col && !selected.includes(col)) setSelected(prev => [...prev, col]);
    setSelectValue('');
  };

  const removeColumn = col => setSelected(prev => prev.filter(c => c !== col));

  const available = columns.filter(c => !selected.includes(c));

  // --- Zoom handlers ---
  const handleMouseDown = e => {
    if (!e?.activeLabel) return;
    setRefAreaLeft(e.activeLabel);
    setSelecting(true);
  };

  const handleMouseMove = e => {
    if (selecting && e?.activeLabel) setRefAreaRight(e.activeLabel);
  };

  const handleMouseUp = () => {
    if (!selecting) return;
    setSelecting(false);

    if (refAreaLeft === '' || refAreaRight === '' || refAreaLeft === refAreaRight) {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    const [x1, x2] = [Number(refAreaLeft), Number(refAreaRight)].sort((a, b) => a - b);

    // Compute Y range for the zoomed window across all selected columns
    const inWindow = chartData.filter(d => d[X_KEY] >= x1 && d[X_KEY] <= x2);
    let yMin = Infinity, yMax = -Infinity;
    inWindow.forEach(d => {
      selected.forEach(col => {
        if (d[col] != null) {
          if (d[col] < yMin) yMin = d[col];
          if (d[col] > yMax) yMax = d[col];
        }
      });
    });

    const padding = (yMax - yMin) * 0.05 || 1;
    setXDomain([x1, x2]);
    setYDomain([yMin - padding, yMax + padding]);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const zoomOut = () => {
    setXDomain(['auto', 'auto']);
    setYDomain(['auto', 'auto']);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center mb-3">
        <button
          className="text-gray-600 hover:text-gray-900 focus:outline-none mr-2"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <span>{open ? '▲' : '▼'}</span>
        </button>
        <h3 className="text-lg font-medium text-gray-800">Blackbox Chart</h3>
        <div className="flex-1" />
        <a
          href={`${apiUrl}/media/${blackboxLog}`}
          download
          className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 mr-2"
          title="Download decoded CSV"
        >
          Download CSV
        </a>
        <button
          onClick={() => {
            const filename = getOriginalFilename(blackboxLog);
            downloadWithAuth(`${apiUrl}/api/blackbox-original/${filename}`, filename);
          }}
          className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
          title="Download original blackbox file"
        >
          Download Original
        </button>
      </div>

      {open && (
        <>
          {loading && (
            <p className="text-sm text-gray-500 py-6 text-center">Loading blackbox data…</p>
          )}

          {error && (
            <p className="text-sm text-red-500 py-6 text-center">Error: {error}</p>
          )}

          {chartData && (
            <>
              {/* Field selector + chips */}
              <div className="flex flex-wrap gap-2 items-center mb-4">
                <select
                  value={selectValue}
                  onChange={e => addColumn(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Add field…</option>
                  {available.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>

                {selected.map((col, i) => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {col}
                    <button
                      onClick={() => removeColumn(col)}
                      className="leading-none hover:opacity-75 text-sm font-bold"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {isZoomed && (
                  <button
                    onClick={zoomOut}
                    className="ml-auto px-3 py-1 text-xs rounded border border-gray-400 bg-white hover:bg-gray-100 text-gray-700"
                  >
                    Zoom Out
                  </button>
                )}
              </div>

              {selected.length > 0 ? (
                <>
                  {!isZoomed && (
                    <p className="text-xs text-gray-400 mb-1 text-right">
                      Click and drag on the chart to zoom in
                    </p>
                  )}
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 20 }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      style={{ cursor: selecting ? 'crosshair' : 'default' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey={X_KEY}
                        type="number"
                        domain={xDomain}
                        allowDataOverflow
                        tickFormatter={v => `${Number(v).toFixed(1)}s`}
                        label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        domain={yDomain}
                        allowDataOverflow
                        tick={{ fontSize: 11 }}
                        width={55}
                      />
                      <Tooltip
                        labelFormatter={v => `t = ${Number(v).toFixed(3)} s`}
                        formatter={(value, name) => [
                          value != null ? Number(value).toFixed(3) : 'N/A',
                          name,
                        ]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {selected.map((col, i) => (
                        <Line
                          key={col}
                          type="monotone"
                          dataKey={col}
                          stroke={COLORS[i % COLORS.length]}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          strokeWidth={1.5}
                        />
                      ))}
                      {selecting && refAreaLeft && refAreaRight && (
                        <ReferenceArea
                          x1={refAreaLeft}
                          x2={refAreaRight}
                          fill="#3b82f6"
                          fillOpacity={0.15}
                          stroke="#3b82f6"
                          strokeOpacity={0.4}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-10">
                  Select a field above to display it in the chart.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BlackboxChart;
