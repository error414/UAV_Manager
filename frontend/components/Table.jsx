import React from 'react';
import EditableRow from './EditableRow';
import { Button } from './index';
import Filters from './Filters';

// Field options constants
const FIELD_OPTIONS = {
  light_conditions: [
    { value: 'Day', label: 'Day' },
    { value: 'Night', label: 'Night' }
  ],
  ops_conditions: [
    { value: 'VLOS', label: 'VLOS' },
    { value: 'BLOS', label: 'BLOS' }
  ],
  pilot_type: [
    { value: 'PIC', label: 'PIC' },
    { value: 'Dual', label: 'Dual' },
    { value: 'Instruction', label: 'Instruction' }
  ]
};

// Unified form field renderer
const renderFormField = (fieldConfig, data, onChange, availableOptions) => {
  const fieldName = fieldConfig.name || fieldConfig.accessor;
  const value = data ? data[fieldName] || '' : '';
  const isEditing = 'accessor' in fieldConfig;
  
  // Handle UAV select field
  if (fieldName === 'uav') {
    return (
      <select
        name={fieldName}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{isEditing ? `Select UAV` : fieldConfig.placeholder}</option>
        {availableOptions.availableUAVs?.map((uav) => (
          <option key={uav.uav_id} value={uav.uav_id}>
            {uav.drone_name}
          </option>
        ))}
      </select>
    );
  }
  
  // Handle predefined select fields
  if (FIELD_OPTIONS[fieldName]) {
    return (
      <select
        name={fieldName}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{isEditing ? `Select ${fieldConfig.header}` : fieldConfig.placeholder}</option>
        {FIELD_OPTIONS[fieldName].map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  
  // Handle custom select options for add field
  if (!isEditing && fieldConfig.type === 'select' && fieldConfig.options) {
    return (
      <select
        name={fieldName}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{fieldConfig.placeholder}</option>
        {fieldConfig.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  
  // Default input field
  const inputType = 
    fieldName.includes('time') ? 'time' : 
    fieldName.includes('date') ? 'date' : 
    fieldConfig.type || 'text';
  
  return (
    <input
      type={inputType}
      name={fieldName}
      placeholder={fieldConfig.placeholder}
      value={value}
      onChange={onChange}
      className="w-full px-2 py-1 border border-gray-300 rounded"
      step={fieldConfig.step}
      min={fieldConfig.min}
    />
  );
};

const ResponsiveTable = ({
  columns,
  data,
  filterFields,
  filters,
  onFilterChange,
  addFields,
  newItem,
  onNewItemChange,
  onAdd,
  onEdit,
  editingId,
  editingData,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  availableOptions,
  hideDesktopFilters = false,
  idField = 'flightlog_id',
  showAddRow = true,
  rowClickable = true,
  showActionColumn = false,
  actionColumnText = 'Actions',
  actionButtons = null,
  customMobileView = null,
  titleField = null, 
}) => {
  // Default action buttons rendering if not provided
  const defaultActionButtons = (itemId) => (
    <Button onClick={(e) => {
      e.stopPropagation();
      onEdit(itemId);
    }} className="bg-blue-500 hover:bg-blue-600">
      Edit
    </Button>
  );

  // Use provided action buttons or default to the edit button
  const renderActionButtons = actionButtons || defaultActionButtons;

  // Editing actions component (reused for mobile and desktop)
  const EditingActions = ({item}) => (
    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
      <Button onClick={onSaveEdit} className="bg-green-500 hover:bg-green-600">Save</Button>
      <Button onClick={onCancelEdit} className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
      <Button onClick={() => onDelete(item[idField])} className="bg-red-500 hover:bg-red-600">Delete</Button>
    </div>
  );

  // Default mobile card rendering
  const defaultMobileCard = (item) => {
    // Get the column to use as the title/header (either specified or default to first column)
    let titleColumn;
    
    if (titleField) {
      // Find the column with the specified accessor
      titleColumn = columns.find(col => col.accessor === titleField) || columns[0];
    } else {
      // Default to first column
      titleColumn = columns[0];
    }
    
    const itemTitle = titleColumn.render 
      ? titleColumn.render(item[titleColumn.accessor], item) 
      : (item[titleColumn.accessor] || 'Untitled');
    
    // Get the content columns (all columns except the title column)
    const contentColumns = columns.filter(col => col.accessor !== titleColumn.accessor);
    
    return (
      <div 
        className={`rounded-lg shadow mb-4 p-4 ${item.is_active === false ? 'bg-red-100' : 'bg-white'} ${rowClickable ? 'cursor-pointer' : ''}`}
        onClick={rowClickable ? () => onEdit(item[idField]) : undefined}
      >
        {editingId === item[idField] ? (
          /* Editing form for mobile */
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {columns.map((col) => (
              <div key={col.accessor} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">{col.header}</label>
                {renderFormField(col, editingData, onEditChange, availableOptions)}
              </div>
            ))}
            <div className="flex space-x-2 mt-3">
              <EditingActions item={item} />
            </div>
          </div>
        ) : (
          /* Card display */
          <>
            <h3 className="font-bold text-lg mb-2">{itemTitle}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                {contentColumns.slice(0, Math.ceil(contentColumns.length / 2)).map((col) => (
                  <p key={col.accessor} className="text-sm mb-1">
                    <span className="font-medium">{col.header}:</span>{' '}
                    {col.render ? col.render(item[col.accessor], item) : (item[col.accessor] || 'N/A')}
                  </p>
                ))}
              </div>
              <div>
                {contentColumns.slice(Math.ceil(contentColumns.length / 2)).map((col) => (
                  <p key={col.accessor} className="text-sm mb-1">
                    <span className="font-medium">{col.header}:</span>{' '}
                    {col.render ? col.render(item[col.accessor], item) : (item[col.accessor] || 'N/A')}
                  </p>
                ))}
              </div>
            </div>
            
            {/* Show action buttons on mobile if showActionColumn is true */}
            {showActionColumn && (
              <div className="flex justify-end space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {renderActionButtons(item[idField], item)}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Mobile view */}
      <div className="sm:hidden overflow-auto pb-20">
        {/* Mobile filters */}
        <Filters 
          fields={filterFields}
          filters={filters}
          onFilterChange={onFilterChange}
          availableOptions={availableOptions}
          asTable={false}
        />
        
        {/* Mobile data cards */}
        <div className="mt-4 space-y-4">
          {(data || []).map((item) => (
            <React.Fragment key={item[idField]}>
              {customMobileView ? customMobileView(item, onEdit) : defaultMobileCard(item)}
            </React.Fragment>
          ))}
        </div>
        
        {/* Mobile Add New form - only if showAddRow is true */}
        {showAddRow && addFields && (
          <div className="mt-6 bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="font-medium text-lg mb-3">Add New</h3>
            <div className="space-y-3">
              {addFields.map((field) => (
                <div key={field.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  {renderFormField(field, newItem, onNewItemChange, availableOptions)}
                </div>
              ))}
              <Button onClick={onAdd} className="w-full bg-green-500 hover:bg-green-600 mt-3">Add</Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-500 table-auto">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.accessor} className="p-2 pl-3">{col.header}</th>
                ))}
                {showActionColumn && <th className="p-2 pl-3">{actionColumnText}</th>}
              </tr>
            </thead>
            <tbody>
              {/* Desktop filters as table row - only if not hidden */}
              {!hideDesktopFilters && (
                <Filters 
                  fields={filterFields}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  availableOptions={availableOptions}
                  asTable={true}
                  columnsCount={showActionColumn ? columns.length + 1 : columns.length}
                />
              )}
              
              {/* Data rows */}
              {(data || []).map((item) => (
                <tr 
                  key={item[idField]} 
                  className={`${item.is_active === false ? 'bg-red-100' : 'bg-white'} border-b hover:bg-gray-50 ${rowClickable ? 'cursor-pointer' : ''}`}
                  onClick={rowClickable ? () => onEdit(item[idField]) : undefined}
                >
                  {editingId === item[idField] ? (
                    <>
                      {columns.map((col) => (
                        <td key={col.accessor} className="py-3 px-4 pl-3" onClick={(e) => e.stopPropagation()}>
                          {renderFormField(col, editingData, onEditChange, availableOptions)}
                        </td>
                      ))}
                      <td className="py-3 px-4 pl-3" onClick={(e) => e.stopPropagation()}>
                        <EditingActions item={item} />
                      </td>
                    </>
                  ) : (
                    <>
                      {columns.map((col) => (
                        <td key={col.accessor} className="py-3 px-4 pl-3">
                          {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
                        </td>
                      ))}
                      {showActionColumn && (
                        <td className="py-3 px-4 pl-3 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          {renderActionButtons(item[idField], item)}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              
              {/* Add new row - only if showAddRow is true */}
              {showAddRow && addFields && (
                <tr className="bg-white border-b">
                  {addFields.map((field) => (
                    <td key={field.name} className="py-3 px-4 pl-3">
                      {renderFormField(field, newItem, onNewItemChange, availableOptions)}
                    </td>
                  ))}
                  <td className="py-3 px-4 pl-3">
                    <Button onClick={onAdd} className="bg-green-500 hover:bg-green-600">Add</Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;