import React from 'react';
import { Button } from '../index';
import Filters from './Filters';
import { CountryDropdown } from 'react-country-region-selector';

const FormField = ({ fieldConfig, data, onChange, availableOptions }) => {
  const fieldName = fieldConfig.name || fieldConfig.accessor;
  const value = data ? data[fieldName] || '' : '';
  const isEditing = 'accessor' in fieldConfig;
  
  if (fieldName === 'uav') {
    const uavOptions = Array.isArray(availableOptions?.availableUAVs) 
      ? availableOptions.availableUAVs : [];
    
    return (
      <select
        name={fieldName}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{isEditing ? `Select UAV` : fieldConfig.placeholder}</option>
        {uavOptions.map((uav) => (
          <option key={uav.uav_id} value={uav.uav_id}>{uav.drone_name}</option>
        ))}
      </select>
    );
  }
  
  if (fieldName === 'country') {
    return (
      <CountryDropdown
        name={fieldName}
        value={value}
        onChange={(val) => onChange({ target: { name: fieldName, value: val } })}
        defaultOptionLabel={isEditing ? `Select country` : fieldConfig.placeholder}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      />
    );
  }
  
  if (fieldName === 'is_staff' || fieldName === 'is_active') {
    return (
      <select
        name={fieldName}
        value={value.toString()}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">Select {fieldConfig.header || fieldConfig.label}</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  
  if (availableOptions?.formOptions?.[fieldName]) {
    return (
      <select
        name={fieldName}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{isEditing ? `Select ${fieldConfig.header}` : fieldConfig.placeholder}</option>
        {availableOptions.formOptions[fieldName].map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  
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

const EditingActions = ({ onSaveEdit, onDelete, itemId }) => (
  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 justify-end" onClick={(e) => e.stopPropagation()}>
    <Button onClick={onSaveEdit} className="bg-green-500 hover:bg-green-600 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2">Save</Button>
    <Button onClick={() => onDelete(itemId)} className="bg-red-500 hover:bg-red-600 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2">Delete</Button>
  </div>
);

const ResponsiveTable = ({
  columns,
  data = [],
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
  onRowClick, 
  mobileFiltersVisible = true, 
  mobileAddNewVisible = true,
  tableStyles = {},
}) => {
  const renderActionButtons = actionButtons || ((itemId) => (
    <Button 
      onClick={(e) => { e.stopPropagation(); onEdit(itemId); }} 
      className="bg-blue-500 hover:bg-blue-600"
    >
      Edit
    </Button>
  ));

  const renderMobileCard = (item) => {
    const titleColumn = titleField 
      ? columns.find(col => col.accessor === titleField) || columns[0]
      : columns[0];
    
    const itemTitle = titleColumn.render 
      ? titleColumn.render(item[titleColumn.accessor], item) 
      : (item[titleColumn.accessor] || 'Untitled');
    
    const contentColumns = columns.filter(col => col.accessor !== titleColumn.accessor);
    const halfLength = Math.ceil(contentColumns.length / 2);
    
    return (
      <div 
        className={`rounded-lg shadow mb-4 p-4 ${item.is_active === false ? 'bg-red-100' : 'bg-white'} ${rowClickable ? 'cursor-pointer' : ''}`}
        onClick={rowClickable ? () => onRowClick(item[idField]) : undefined}
      >
        {editingId === item[idField] ? (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {columns.map((col) => (
              <div key={col.accessor} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">{col.header}</label>
                <FormField fieldConfig={col} data={editingData} onChange={onEditChange} availableOptions={availableOptions} />
              </div>
            ))}
            <EditingActions 
              onSaveEdit={onSaveEdit} 
              onDelete={onDelete} 
              itemId={item[idField]} 
            />
          </div>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-2">{itemTitle}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                {contentColumns.slice(0, halfLength).map((col) => (
                  <p key={col.accessor} className="text-sm mb-1">
                    <span className="font-medium">{col.header}:</span>{' '}
                    {col.render ? col.render(item[col.accessor], item) : (item[col.accessor] || 'N/A')}
                  </p>
                ))}
              </div>
              <div>
                {contentColumns.slice(halfLength).map((col) => (
                  <p key={col.accessor} className="text-sm mb-1">
                    <span className="font-medium">{col.header}:</span>{' '}
                    {col.render ? col.render(item[col.accessor], item) : (item[col.accessor] || 'N/A')}
                  </p>
                ))}
              </div>
            </div>
            
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

  // Check if any row is being edited
  const isAnyRowInEditMode = editingId !== null;

  // Get column classes based on current edit state
  const getColumnClasses = (col) => {
    let columnClass = '';
    
    return columnClass;
  };

  return (
    <div>
      {/* Mobile View */}
      <div className="lg:hidden overflow-auto pb-0">
        {mobileFiltersVisible && (
          <Filters 
            fields={filterFields}
            filters={filters}
            onFilterChange={onFilterChange}
            availableOptions={availableOptions}
            asTable={false}
          />
        )}
        
        <div className="mt-2 space-y-3">
          {data.map((item) => (
            <React.Fragment key={item[idField]}>
              {customMobileView ? customMobileView(item, onEdit) : renderMobileCard(item)}
            </React.Fragment>
          ))}
        </div>
        
        {showAddRow && addFields && mobileAddNewVisible && (
          <div className="mt-1 bg-white p-3 rounded-lg shadow border border-gray-200">
            <h3 className="font-medium text-lg mb-2">Add New</h3>
            <div className="space-y-2">
              {addFields.map((field) => (
                <div key={field.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <FormField fieldConfig={field} data={newItem} onChange={onNewItemChange} availableOptions={availableOptions} />
                </div>
              ))}
              <Button onClick={onAdd} className="w-full bg-green-500 hover:bg-green-600 mt-2">Add</Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block lg:h-[calc(100vh-160px)] lg:min-h-[400px] flex flex-col">
        <div className="flex-grow overflow-hidden rounded-lg border border-gray-200 shadow-md">
          <table className="w-full text-sm text-left text-gray-500 table-fixed" style={tableStyles}>
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th key={col.accessor} className={`p-2 pl-3 overflow-hidden text-ellipsis whitespace-nowrap ${getColumnClasses(col)}`}>
                    {col.header}
                  </th>
                ))}
                {showActionColumn && (
                  <th className={`p-2 pl-3 text-right ${isAnyRowInEditMode ? 'w-[150px]' : 'w-[100px]'}`}>
                    {actionColumnText}
                  </th>
                )}
              </tr>
            </thead>
            {!hideDesktopFilters && (
              <tbody className="bg-gray-50">
                <Filters 
                  fields={filterFields}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  availableOptions={availableOptions}
                  asTable={true}
                  columnsCount={showActionColumn ? columns.length + 1 : columns.length}
                />
              </tbody>
            )}
            <tbody className="divide-y divide-gray-200 overflow-auto">
                {data.map((item) => (
                  <tr 
                    key={item[idField]} 
                    className={`${item.is_active === false ? 'bg-red-100' : 'bg-white'} border-b hover:bg-gray-50 ${rowClickable ? 'cursor-pointer' : ''}`}
                    onClick={rowClickable ? () => onRowClick(item[idField]) : undefined}
                  >
                    {editingId === item[idField] ? (
                      <>
                        {columns.map((col) => (
                          <td key={col.accessor} 
                              className={`py-1 px-2 overflow-hidden text-ellipsis whitespace-nowrap ${getColumnClasses(col)}`} 
                              onClick={(e) => e.stopPropagation()}>
                            <FormField 
                              fieldConfig={col} 
                              data={editingData} 
                              onChange={onEditChange} 
                              availableOptions={availableOptions} 
                            />
                          </td>
                        ))}
                        <td className="py-1 px-2 text-right w-[150px]" onClick={(e) => e.stopPropagation()}>
                          <EditingActions 
                            onSaveEdit={onSaveEdit} 
                            onDelete={onDelete} 
                            itemId={item[idField]} 
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        {columns.map((col) => (
                          <td key={col.accessor} className={`py-2 px-3 overflow-hidden text-ellipsis whitespace-nowrap ${getColumnClasses(col)}`}>
                            <div className="truncate">
                              {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
                            </div>
                          </td>
                        ))}
                        {showActionColumn && (
                          <td className="py-2 px-3 text-right w-[100px]" onClick={(e) => e.stopPropagation()}>
                            {renderActionButtons(item[idField], item)}
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
            {showAddRow && addFields && (
              <tfoot className="bg-white border-t sticky bottom-0 z-10">
                <tr>
                  {addFields.map((field) => (
                    <td key={field.name} className="py-2 px-3">
                      <FormField fieldConfig={field} data={newItem} onChange={onNewItemChange} availableOptions={availableOptions} />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right">
                    <Button onClick={onAdd} className="bg-green-500 hover:bg-green-600">Add</Button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;