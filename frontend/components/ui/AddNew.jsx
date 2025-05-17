import Button from './Button';

const AddNew = ({ fields, formValues, onChange, onSubmit, submitLabel = "Add", asTable }) => {
  if (asTable) {
    // Desktop view: render as a table row.
    return (
      <tr className="hidden xl:table-row">
        {fields.map(field => (
          <td key={field.name} className="p-2">
            {field.type === "select" ? (
              <select
                name={field.name}
                value={formValues[field.name]}
                onChange={onChange}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
              >
                <option value="">{field.placeholder || "Select"}</option>
                {field.options &&
                  field.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={formValues[field.name]}
                onChange={onChange}
                placeholder={field.placeholder || ""}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                step={field.step}
                min={field.min}
              />
            )}
          </td>
        ))}
        <td className="p-2">
          <Button onClick={onSubmit} className="bg-green-600 hover:bg-green-700">
            {submitLabel}
          </Button>
        </td>
      </tr>
    );
  }

  // Mobile view: render as a block.
  return (
    <div className="xl:hidden p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
      <h3 className="font-medium text-gray-700 mb-3">Add New Item</h3>
      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.name} className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-gray-700">
              {field.label} {field.required && "*"}
            </label>
            {field.type === "select" ? (
              <select
                name={field.name}
                value={formValues[field.name]}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
              >
                <option value="">{field.placeholder || "Select"}</option>
                {field.options &&
                  field.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={formValues[field.name]}
                onChange={onChange}
                placeholder={field.placeholder || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                step={field.step}
                min={field.min}
              />
            )}
          </div>
        ))}
        <Button onClick={onSubmit} className="bg-green-600 hover:bg-green-700 mt-2">
          {submitLabel}
        </Button>
        <p className="text-xs text-gray-500 mt-1">* Required fields</p>
      </div>
    </div>
  );
};

export default AddNew;