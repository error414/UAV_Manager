import React, { useState, useEffect } from 'react';
import { parse } from 'papaparse';

const CSVImporter = ({
  setError,
  navigate,
  API_URL,
  getAuthHeaders,
  availableUAVs,
  fetchFlightLogs
}) => {
  const processCSVData = async (data) => {
    if (data.length === 0) {
      setError('No records found in the CSV file');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      if (!token || !user_id) {
        navigate('/login');
        return;
      }
      
      const uavMap = {};
      availableUAVs.forEach(uav => {
        uavMap[uav.drone_name] = uav.uav_id;
      });

      // Track which model names couldn't be matched
      const unmappedModelLogs = {};

      const newLogs = data
        .map(row => {
          const departureTime = row['Timestamp-TO'] || '';
          const landingTime = row['Timestamp-LDG'] || '';
          
          // Check if ModelName exists and can be mapped to a UAV
          let uavId = null;
          if (row['ModelName'] && uavMap[row['ModelName']]) {
            uavId = uavMap[row['ModelName']];
          } else {
            // Track unmapped model names for later reporting
            if (row['ModelName']) {
              if (!unmappedModelLogs[row['ModelName']]) {
                unmappedModelLogs[row['ModelName']] = 0;
              }
              unmappedModelLogs[row['ModelName']]++;
            }
            return null;
          }
          
          let duration = '';
          if (row['Duration']) {
            duration = Math.round(parseFloat(row['Duration']));
          }
          
          const departLocation =
            row['GPS-Arming-Lat'] && row['GPS-Arming-Lon'] && 
            (parseFloat(row['GPS-Arming-Lat']) !== 0 || parseFloat(row['GPS-Arming-Lon']) !== 0)
              ? `${row['GPS-Arming-Lat']},${row['GPS-Arming-Lon']}`
              : 'Unknown';
            
          const landingLocation =
            row['GPS-Disarming-Lat'] && row['GPS-Disarming-Lon'] && 
            (parseFloat(row['GPS-Disarming-Lat']) !== 0 || parseFloat(row['GPS-Disarming-Lon']) !== 0)
              ? `${row['GPS-Disarming-Lat']},${row['GPS-Disarming-Lon']}`
              : 'Unknown';
          
          return {
            departure_place: departLocation,
            departure_date: row['Date'] || '',
            departure_time: departureTime,
            landing_time: landingTime,
            landing_place: landingLocation,
            flight_duration: duration,
            takeoffs: 1,
            landings: 1,
            light_conditions: 'Day',
            ops_conditions: 'VLOS',
            pilot_type: 'PIC',
            uav: uavId,
            comments: `Imported`,
            user: user_id
          };
        })
        .filter(log => log !== null); 

      // First, fetch existing logs to compare against
      const existingLogs = await fetch(`${API_URL}/api/flightlogs/?user=${user_id}`, {
        headers: getAuthHeaders()
      })
      .then(res => {
        if (!res.ok) {
          if (handleAuthError(res)) return [];
          throw new Error('Failed to fetch existing flight logs');
        }
        return res.json();
      })
      .catch(err => {
        console.error("Error fetching existing logs:", err);
        return [];
      });

      // Then update the import process with duplicate detection
      let successCount = 0;
      let skippedCount = 0;
      let errors = [];

      for (const log of newLogs) {
        try {
          if (log.departure_date && !log.departure_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const dateParts = log.departure_date.split(/[-/.]/);
            if (dateParts.length === 3) {
              if (dateParts[2].length === 4) {
                log.departure_date = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
              }
            }
          }
          
          if (log.flight_duration) {
            log.flight_duration = parseInt(log.flight_duration, 10) || 0;
          }
          
          log.takeoffs = parseInt(log.takeoffs, 10) || 1;
          log.landings = parseInt(log.landings, 10) || 1;

          const isDuplicate = existingLogs.some(existingLog => 
            existingLog.departure_date === log.departure_date &&
            existingLog.departure_time === log.departure_time &&
            existingLog.uav === log.uav
          );
          
          if (isDuplicate) {
            console.log("Skipping duplicate log:", log);
            skippedCount++;
            continue;
          }
          
          console.log("Sending log to API:", log);
          
          const response = await fetch(`${API_URL}/api/flightlogs/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(log)
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            console.error("API error:", errorData);
            errors.push(`Log ${successCount+errors.length+1}: ${JSON.stringify(errorData)}`);
          }
        } catch (err) {
          console.error("Error importing log:", err);
          errors.push(`Log ${successCount+errors.length+1}: ${err.message}`);
        }
      }

      fetchFlightLogs();

      let unmappedModelMessage = '';
      if (Object.keys(unmappedModelLogs).length > 0) {
        unmappedModelMessage = '\n\nSkipped logs for these unmapped UAV models:';
        for (const [model, count] of Object.entries(unmappedModelLogs)) {
          unmappedModelMessage += `\n- ${model}: ${count} log(s)`;
        }
      }

      if (errors.length > 0) {
        setError(`Imported ${successCount} of ${data.length} logs. ` +
                 `Skipped ${skippedCount} duplicates and ${data.length - newLogs.length} unmapped UAVs. ` +
                 `Errors: ${errors.length}`);
        console.error("Import errors:", errors);
        console.info("Unmapped models:", unmappedModelLogs);
      } else {
        setError(null);
        alert(`Successfully imported ${successCount} of ${data.length} logs. ` +
              `Skipped ${skippedCount} duplicates and ${data.length - newLogs.length} logs with unmapped UAVs.` +
              unmappedModelMessage);
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

export default CSVImporter;