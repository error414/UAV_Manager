import React, { useState } from 'react';
import { parse } from 'papaparse';

const UAVImporter = ({
  setError,
  navigate,
  API_URL,
  getAuthHeaders,
  fetchAircrafts
}) => {
  const processCSVData = async (data) => {
    if (data.length === 0) {
      setError('No records found in the CSV file');
      return;
    }
    
    console.log('CSV data before processing:', data); // Debug raw data
    
    try {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      if (!token || !user_id) {
        navigate('/login');
        return;
      }

      // Track which UAVs are duplicates based on serial number
      const duplicateSerialNumbers = {};
      
      // Track which UAVs are duplicates based on drone name (not serial number)
      const duplicateDroneNames = {};
      
      const newUAVs = data
        .map(row => {
          // Check for truly required fields per Django model
          if (!row['DroneName'] || !row['Type'] || !row['Motors']) {
            console.log('Skipping entry due to missing required field:', row);
            return null; // Will be filtered out below
          }
          
          // Create UAV object with proper defaults for required fields
          return {
            user: user_id,
            drone_name: row['DroneName'],
            manufacturer: row['Manufacturer'] || '',
            type: row['Type'], // Required
            motors: parseInt(row['Motors'], 10) || 1, // Required, ensure it's a number
            motor_type: row['MotorType'] || '',
            video: row['Video'] || '',
            video_system: row['VideoSystem'] || '',
            esc: row['ESC'] || '',
            esc_firmware: row['ESCFirmware'] || '',
            receiver: row['Receiver'] || '',
            receiver_firmware: row['ReceiverFirmware'] || '',
            flight_controller: row['FlightController'] || '',
            firmware: row['Firmware'] || '',
            firmware_version: row['FirmwareVersion'] || '',
            gps: row['GPS'] || '',
            mag: row['MAG'] || '',
            baro: row['BARO'] || '',
            gyro: row['GYRO'] || '',
            acc: row['ACC'] || '',
            registration_number: row['RegistrationNumber'] || '',
            serial_number: row['SerialNumber'] || null,
            is_active: true
          };
        })
        .filter(uav => uav !== null);

      console.log('After mapping and filtering, UAVs to import:', newUAVs.length); // Debug filtered data
      
      // Fetch existing UAVs to check for duplicates
      const existingUAVs = await fetch(`${API_URL}/api/uavs/?user=${user_id}`, {
        headers: getAuthHeaders()
      })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            navigate('/login');
            return [];
          }
          throw new Error('Failed to fetch existing UAVs');
        }
        return res.json();
      })
      .then(data => {
        console.log("Existing UAVs fetched:", data.length, data);
        return data;
      })
      .catch(err => {
        console.error("Error fetching existing UAVs:", err);
        return [];
      });

      // Track import statistics
      let successCount = 0;
      let skippedCount = 0;
      let errors = [];

      for (const uav of newUAVs) {
        try {
          // Check if this UAV already exists (by drone name)
          const isDuplicate = existingUAVs.some(existingUAV => {
            const match = existingUAV.drone_name === uav.drone_name;
            if (match) {
              console.log(`Found duplicate: ${uav.drone_name}`);
            }
            return match;
          });
          
          if (isDuplicate) {
            console.log(`Skipping duplicate UAV: ${uav.drone_name}`);
            if (!duplicateDroneNames[uav.drone_name]) {
              duplicateDroneNames[uav.drone_name] = 0;
            }
            duplicateDroneNames[uav.drone_name]++;
            skippedCount++;
            continue; // Skip to next UAV
          }
          
          console.log("Sending UAV to API:", uav);
          
          const response = await fetch(`${API_URL}/api/uavs/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(uav)
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            console.error("API error for UAV:", uav.drone_name, errorData);
            errors.push(`UAV ${uav.drone_name}: ${JSON.stringify(errorData)}`);
          }
        } catch (err) {
          console.error("Error importing UAV:", err);
          errors.push(`UAV ${uav.drone_name}: ${err.message}`);
        }
      }

      // Refresh the UAV list
      fetchAircrafts();

      // Create message about duplicate serial numbers
      let duplicateMessage = '';
      if (Object.keys(duplicateSerialNumbers).length > 0) {
        duplicateMessage = '\n\nSkipped UAVs with these serial numbers (already exist):';
        for (const [serial, count] of Object.entries(duplicateSerialNumbers)) {
          duplicateMessage += `\n- ${serial}: ${count} UAV(s)`;
        }
      }

      // Create message about duplicate UAVs
      if (Object.keys(duplicateDroneNames).length > 0) {
        duplicateMessage += '\n\nSkipped UAVs with these names (already exist):';
        for (const [name, count] of Object.entries(duplicateDroneNames)) {
          duplicateMessage += `\n- ${name}: ${count} UAV(s)`;
        }
      }

      if (errors.length > 0) {
        setError(`Imported ${successCount} of ${data.length} UAVs. ` +
                 `Skipped ${skippedCount} duplicates. ` +
                 `Errors: ${errors.length}`);
        console.error("Import errors:", errors);
      } else {
        setError(null);
        alert(`Successfully imported ${successCount} of ${data.length} UAVs. ` +
              `Skipped ${skippedCount} duplicates.` +
              duplicateMessage);
      }
      
    } catch (err) {
      console.error('Error importing CSV data:', err);
      setError('Failed to import CSV data. Check console for details.');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    event.target.value = null;
    
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }
        processCSVData(results.data);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  return { handleFileUpload };
};

export default UAVImporter;
