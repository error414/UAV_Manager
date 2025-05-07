import React from 'react';
import { FormInput, Button } from '../index';

const DROPDOWN_OPTIONS = {
  aircraftTypes: [
    { value: 'Quad', label: 'Quad' },
    { value: 'Tricopter', label: 'Tricopter' },
    { value: 'Hexacopter', label: 'Hexacopter' },
    { value: 'Wing', label: 'Wing' },
    { value: 'Airplane', label: 'Airplane' },
    { value: 'Other', label: 'Other' }
  ],
  motorTypes: [
    { value: 'Electric', label: 'Electric' },
    { value: 'Piston', label: 'Piston' },
    { value: 'Jet', label: 'Jet' },
    { value: 'Glider', label: 'Glider' }
  ],
  firmwareOptions: [
    { value: 'Betaflight', label: 'Betaflight' },
    { value: 'INAV', label: 'INAV' },
    { value: 'Cleanflight', label: 'Cleanflight' },
    { value: 'Baseflight', label: 'Baseflight' },
    { value: 'Emuflight', label: 'Emuflight' },
    { value: 'DJI', label: 'DJI' },
    { value: 'KISS', label: 'KISS' },
    { value: 'Ardupilot', label: 'Ardupilot' },
    { value: 'Other', label: 'Other' }
  ],
  videoOptions: [
    { value: 'Analog', label: 'Analog' },
    { value: 'Digital', label: 'Digital' },
    { value: 'None', label: 'None' }
  ],
  videoSystemOptions: [
    { value: 'HD-Zero', label: 'HD-Zero' },
    { value: 'DJI O2', label: 'DJI O2' },
    { value: 'DJI O3', label: 'DJI O3' },
    { value: 'DJI O4', label: 'DJI O4' },
    { value: 'Analog', label: 'Analog' },
    { value: 'Walksnail', label: 'Walksnail' },
    { value: 'Caddx Vista', label: 'Caddx Vista' },
    { value: 'Others', label: 'Others' }
  ],
  flightControllerTypes: [
    { value: 'Happymodel x12 AIO', label: 'Happymodel x12 AIO' },
    { value: 'KISS', label: 'KISS' },
    { value: 'DJI', label: 'DJI' },
    { value: 'Ardupilot', label: 'Ardupilot' },
    { value: 'Other', label: 'Other' }
  ]
};

const MaintenanceDatePair = ({ label, maintDate, reminderDate, onChange, formatDate, reminderDateValue, disabled }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>{label} Maint:</label>
      <FormInput
        type="date"
        name={`${maintDate}_maint_date`}
        id={`${maintDate}_maint_date`}
        value={formatDate}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
    <div>
      <label>Next:</label>
      <FormInput
        type="date"
        name={`${maintDate}_reminder_date`}
        id={`${maintDate}_reminder_date`}
        value={reminderDateValue}
        onChange={onChange}
        className="mt-0 w-full"
        disabled={disabled}
      />
    </div>
  </div>
);

const AircraftForm = ({ 
  formData, 
  handleChange, 
  handleSubmit, 
  formatDateForInput, 
  isEditMode, 
  isLoading,
  canDelete,
  handleDelete,
  handleSetInactive,
  handleToggleActive,
  handleSetTodayMaintDates,
  handleBackToSettings // New prop
}) => {
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label>Drone Name</label>
          <FormInput
            type="text"
            name="drone_name"
            id="drone_name"
            value={formData.drone_name}
            onChange={handleChange}
            placeholder="ModularHDZero"
            required
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div>
          <label>Manufacturer</label>
          <FormInput
            type="text"
            name="manufacturer"
            id="manufacturer"
            value={formData.manufacturer}
            onChange={handleChange}
            placeholder="Happymodel"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <FormInput
          type="select"
          label="Type"
          name="type"
          id="type"
          value={formData.type}
          onChange={handleChange}
          options={DROPDOWN_OPTIONS.aircraftTypes}
          required
          disabled={isEditMode && formData.is_active === false}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Motors</label>
            <FormInput
              type="number"
              name="motors"
              id="motors"
              value={formData.motors}
              onChange={handleChange}
              min="0"
              required
              disabled={isEditMode && formData.is_active === false}
            />
          </div>
          
          <div>
            <FormInput
              type="select"
              label="Type of Motor"
              name="motor_type"
              id="motor_type"
              value={formData.motor_type}
              onChange={handleChange}
              options={DROPDOWN_OPTIONS.motorTypes}
              required
              disabled={isEditMode && formData.is_active === false}
            />
          </div>
        </div>
        
        <FormInput
          type="select"
          label="Video"
          name="video"
          id="video"
          value={formData.video}
          onChange={handleChange}
          options={DROPDOWN_OPTIONS.videoOptions}
          disabled={isEditMode && formData.is_active === false}
        />
        
        <FormInput
          type="select"
          label="Video System"
          name="video_system"
          id="video_system"
          value={formData.video_system}
          onChange={handleChange}
          options={DROPDOWN_OPTIONS.videoSystemOptions}
          disabled={isEditMode && formData.is_active === false}
        />
        
        <div>
          <label>ESC</label>
          <FormInput
            type="text"
            name="esc"
            id="esc"
            value={formData.esc}
            onChange={handleChange}
            placeholder="Happymodel x12 AIO 12A"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div>
          <label>ESC Firmware</label>
          <FormInput
            type="text"
            name="esc_firmware"
            id="esc_firmware"
            value={formData.esc_firmware}
            onChange={handleChange}
            placeholder="Bluejay_0.21.0"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div>
          <label>Receiver</label>
          <FormInput
            type="text"
            name="receiver"
            id="receiver"
            value={formData.receiver}
            onChange={handleChange}
            placeholder="RadioMaster RP1"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div>
          <label>Receiver Firmware</label>
          <FormInput
            type="text"
            name="receiver_firmware"
            id="receiver_firmware"
            value={formData.receiver_firmware}
            onChange={handleChange}
            placeholder="elrs v3.5.3"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label>Flight Controller</label>
          <FormInput
            type="text"
            name="flight_controller"
            id="flight_controller"
            value={formData.flight_controller}
            onChange={handleChange}
            placeholder="Happymodel x12 AIO"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <FormInput
          type="select"
          label="Firmware"
          name="firmware"
          id="firmware"
          value={formData.firmware}
          onChange={handleChange}
          options={DROPDOWN_OPTIONS.firmwareOptions}
          disabled={isEditMode && formData.is_active === false}
        />
        
        <div>
          <label>Firmware Version</label>
          <FormInput
            type="text"
            name="firmware_version"
            id="firmware_version"
            value={formData.firmware_version}
            onChange={handleChange}
            placeholder="4.5.5"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div className="grid grid-cols-5 gap-1">
          {['gps', 'mag', 'baro', 'gyro', 'acc'].map(sensor => (
            <div key={sensor}>
              <label>{sensor.toUpperCase()}</label>
              <FormInput
                type="number"
                name={sensor}
                id={sensor}
                value={formData[sensor]}
                onChange={handleChange}
                min="0"
                className="text-center"
                disabled={isEditMode && formData.is_active === false}
              />
            </div>
          ))}
        </div>
        
        <div>
          <label>Registration Number</label>
          <FormInput
            type="text"
            name="registration_number"
            id="registration_number"
            value={formData.registration_number}
            onChange={handleChange}
            placeholder="CHEdkI9245ddjG325"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div>
          <label>Serial Number</label>
          <FormInput
            type="text"
            name="serial_number"
            id="serial_number"
            value={formData.serial_number}
            onChange={handleChange}
            placeholder="SN5678905312AB"
            disabled={isEditMode && formData.is_active === false}
          />
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <h3 className="text-lg font-medium text-black">Last Maintenance:</h3>
          <button
            type="button"
            onClick={handleSetTodayMaintDates}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            disabled={isEditMode && formData.is_active === false}
          >
            Today
          </button>
        </div>
        
        {['props', 'motor', 'frame'].map(item => (
          <MaintenanceDatePair 
            key={item}
            label={item.charAt(0).toUpperCase() + item.slice(1)}
            maintDate={item}
            reminderDate={item}
            onChange={handleChange}
            formatDate={formatDateForInput(formData[`${item}_maint_date`])}
            reminderDateValue={formatDateForInput(formData[`${item}_reminder_date`])}
            disabled={isEditMode && formData.is_active === false}
          />
        ))}
      </div>
      
      <div className="col-span-1 md:col-span-2 mt-6 flex justify-center gap-4">
        {isEditMode && (
          <Button onClick={handleBackToSettings} className="max-w-md bg-gray-600 hover:bg-gray-700">
            Back to Aircraft Settings
          </Button>
        )}
        
        {isEditMode && formData.is_active === false && (
          <Button 
            type="button" 
            onClick={handleToggleActive} 
            className="max-w-md bg-green-600 hover:bg-green-700"
          >
            Reactivate Aircraft
          </Button>
        )}
        
        {isEditMode && formData.is_active !== false && canDelete && (
          <Button 
            type="button" 
            onClick={handleDelete} 
            className="max-w-md bg-red-600 hover:bg-red-700"
          >
            Delete Aircraft
          </Button>
        )}
        
        {isEditMode && formData.is_active !== false && !canDelete && (
          <Button 
            type="button" 
            onClick={handleSetInactive} 
            className="max-w-md bg-yellow-600 hover:bg-yellow-700"
          >
            Set Inactive
          </Button>
        )}
        
        {(!isEditMode || formData.is_active !== false) && (
          <Button type="submit" className="max-w-md">
            {isEditMode ? 'Update Aircraft' : 'Save Aircraft'}
          </Button>
        )}
      </div>
    </form>
  );
};

export default AircraftForm;
