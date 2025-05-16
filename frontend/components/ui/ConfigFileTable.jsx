import { Button } from '../index';

const ConfigFileTable = ({
  // Common props
  tableType = 'config', // Can be 'config' or 'logs'
  getFilenameFromUrl,
  
  // Config file specific props
  configFiles = [],
  selectedConfigs = [],
  onConfigSelection,
  onDeleteConfig,
  configFile,
  configFormErrors,
  onConfigChange,
  onAddConfig,
  configFileInputRef,
  onCompareFiles,
  
  // Maintenance log specific props
  logs = [],
  columns,
  editingLogId,
  editingLog,
  formErrors,
  onEditLog,
  onSaveEdit,
  onCancelEdit,
  onDeleteLog,
  onEditChange,
  newLog,
  newLogErrors,
  onNewLogChange,
  onAddLog,
  fileInputRef
}) => {
  // Config files table specific logic
  const showCompareButton = selectedConfigs.length === 2;
  
  // Helper for rendering form inputs (extracted from MaintenanceLogTable)
  const renderInput = ({ type, name, value, onChange, placeholder, error, ...rest }) => (
    <>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-2 py-1 border rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
        required
        {...rest}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </>
  );

  // CONFIGURATION FILES TABLE
  if (tableType === 'config') {
    return (
      <>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-800">Configuration Files</h3>
          {showCompareButton && (
            <Button onClick={onCompareFiles} variant="primary">
              Compare Selected Files
            </Button>
          )}
        </div>
        <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">Select</th>
              <th className="px-4 py-2">Config Name</th>
              <th className="px-4 py-2">File</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {configFiles.map((config) => (
              <tr key={config.config_id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedConfigs.includes(config.config_id)}
                    onChange={() => onConfigSelection(config.config_id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-2">
                  {config.name || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {config.file ? (
                    <a href={config.file} download className="text-blue-500 hover:underline">
                      {getFilenameFromUrl(config.file)}
                    </a>
                  ) : 'N/A'}
                </td>
                <td className="px-4 py-2">
                  <Button onClick={() => onDeleteConfig(config.config_id)} variant="danger">Delete</Button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="px-4 py-2"></td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  name="name"
                  value={configFile.name}
                  onChange={onConfigChange}
                  placeholder="Enter configuration name"
                  className={`w-full px-2 py-1 border rounded ${configFormErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {configFormErrors.name && <p className="text-red-500 text-xs mt-1">{configFormErrors.name}</p>}
              </td>
              <td className="px-4 py-2">
                <input
                  type="file"
                  name="file"
                  onChange={onConfigChange}
                  className={`w-full px-2 py-1 border rounded ${configFormErrors.file ? 'border-red-500' : 'border-gray-300'}`}
                  ref={configFileInputRef}
                />
                {configFormErrors.file && <p className="text-red-500 text-xs mt-1">{configFormErrors.file}</p>}
              </td>
              <td className="px-4 py-2">
                <Button onClick={onAddConfig} variant="success">Add</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </>
    );
  }
  
  // MAINTENANCE LOGS TABLE
  return (
    <>
      <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Logs</h3>
      <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={col.accessor} className="px-4 py-2">{col.header}</th>
            ))}
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index} className="bg-white border-b hover:bg-gray-50">
              {editingLogId === log.maintenance_id ? (
                <>
                  <td className="px-4 py-2">
                    {renderInput({
                      type: "date",
                      name: "event_date",
                      value: editingLog.event_date,
                      onChange: onEditChange,
                      error: formErrors.event_date
                    })}
                  </td>
                  <td className="px-4 py-2">
                    {renderInput({
                      type: "text",
                      name: "description",
                      value: editingLog.description,
                      onChange: onEditChange,
                      error: formErrors.description
                    })}
                  </td>
                  <td className="px-4 py-2">
                    {editingLog.originalFile && (
                      <div className="mb-2 text-sm">
                        <span>Current file: </span>
                        <a href={editingLog.originalFile} download className="text-blue-500 hover:underline">
                          {getFilenameFromUrl(editingLog.originalFile)}
                        </a>
                      </div>
                    )}
                    <input
                      type="file"
                      name="file"
                      onChange={onEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to keep current file</p>
                  </td>
                  <td className="px-4 py-2 space-x-2 flex">
                    <Button onClick={onSaveEdit} variant="success">Save</Button>
                    <Button onClick={onCancelEdit} variant="secondary">Cancel</Button>
                    <Button onClick={() => onDeleteLog(log.maintenance_id)} variant="danger">Delete</Button>
                  </td>
                </>
              ) : (
                <>
                  {columns.map(col => (
                    <td className="px-4 py-2" key={col.accessor}>
                      {col.accessor === 'file' && log.file
                        ? (
                            <a href={log.file} download className="text-blue-500 hover:underline">
                              {getFilenameFromUrl(log.file)}
                            </a>
                          )
                        : col.render
                          ? col.render(log[col.accessor], log)
                          : log[col.accessor] || 'N/A'}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <Button onClick={() => onEditLog(log.maintenance_id)} variant="primary">Edit</Button>
                  </td>
                </>
              )}
            </tr>
          ))}
          <tr className="bg-gray-50">
            <td className="px-4 py-2">
              {renderInput({
                type: "date",
                name: "event_date",
                value: newLog.event_date,
                onChange: onNewLogChange,
                error: newLogErrors.event_date
              })}
            </td>
            <td className="px-4 py-2">
              {renderInput({
                type: "text",
                name: "description",
                value: newLog.description,
                onChange: onNewLogChange,
                placeholder: "Description",
                error: newLogErrors.description
              })}
            </td>
            <td className="px-4 py-2">
              <input
                type="file"
                name="file"
                onChange={onNewLogChange}
                className="w-full px-2 py-1 border border-gray-300 rounded"
                ref={fileInputRef}
              />
            </td>
            <td className="px-4 py-2">
              <Button onClick={onAddLog} variant="success">Add</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default ConfigFileTable;
