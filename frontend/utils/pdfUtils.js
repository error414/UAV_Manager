import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatSecondsToHMS = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0h 0min 0sec";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}min ${s}sec`;
};

const getUAVName = (uav) => {
  if (!uav) return '';
  return typeof uav === 'string' ? uav : (uav.drone_name || uav.uav_id || '');
};

const drawTextWithSeparator = (doc, leftText, rightText, x1, x2, y, drawLine = true) => {
  doc.text(leftText, x1, y);
  if (drawLine) {
    doc.setDrawColor(150);
    doc.line(100, y - 3, 100, y + 3);
  }
  if (rightText) doc.text(rightText, x2, y);
  return y + 7;
};

export const exportFlightLogToPDF = async (flightLogs, userData) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  const stats = {
    totalFlights: flightLogs.length,
    totalLandings: 0,
    totalTakeoffs: 0,
    totalFlightSeconds: 0,
    totalPIC: 0,
    totalDual: 0,
    totalInstructor: 0,
    totalDay: 0,
    totalNight: 0,
    uavSet: new Set(),
    opsCounts: {},
    pilotTypeCounts: {}
  };

  flightLogs.forEach(log => {
    stats.totalLandings += log.landings || 0;
    stats.totalTakeoffs += log.takeoffs || 0;
    stats.totalFlightSeconds += log.flight_duration || 0;
    if (log.pilot_type === 'PIC') stats.totalPIC += log.flight_duration || 0;
    if (log.pilot_type === 'Dual') stats.totalDual += log.flight_duration || 0;
    if (log.pilot_type === 'Instruction') stats.totalInstructor += log.flight_duration || 0;
    if (log.light_conditions === 'Day') stats.totalDay += log.flight_duration || 0;
    if (log.light_conditions === 'Night') stats.totalNight += log.flight_duration || 0;
    if (log.uav) {
      if (typeof log.uav === 'object' && log.uav.uav_id) {
        stats.uavSet.add(log.uav.uav_id);
      } else if (typeof log.uav === 'string') {
        stats.uavSet.add(log.uav);
      }
    }
    if (log.ops_conditions) {
      stats.opsCounts[log.ops_conditions] = (stats.opsCounts[log.ops_conditions] || 0) + 1;
    }
    if (log.pilot_type) {
      stats.pilotTypeCounts[log.pilot_type] = (stats.pilotTypeCounts[log.pilot_type] || 0) + 1;
    }
  });

  let y = 14;
  const leftX = 14, rightX = 110;

  doc.setFontSize(14);
  doc.text('Flight Log Overview', leftX, y);
  y += 8;
  doc.setFontSize(10);

  if (userData) {
    y = drawTextWithSeparator(doc, `Name: ${userData.first_name || ''} ${userData.last_name || ''}`, 
                             `Email: ${userData.email || ''}`, leftX, rightX, y);
    if (userData.company || userData.phone) {
      y = drawTextWithSeparator(doc, `Company: ${userData.company || ''}`, 
                               `Phone: ${userData.phone || ''}`, leftX, rightX, y);
    }
    if (userData.city || userData.country) {
      y = drawTextWithSeparator(doc, `City: ${userData.city || ''}`, 
                               `Country: ${userData.country || ''}`, leftX, rightX, y);
    }
  }

  y += 3;
  doc.setDrawColor(100);
  doc.line(leftX, y, 195, y);
  y += 7;

  doc.setFontSize(12);
  doc.text('Total Flight Times', leftX, y);
  doc.setDrawColor(180);
  doc.line(100, y - 3, 100, y + 35);
  y += 7;
  doc.setFontSize(11);

  const timeStats = [
    ['Total Flight Time:', formatSecondsToHMS(stats.totalFlightSeconds)],
    ['PIC Flight Time:', formatSecondsToHMS(stats.totalPIC)],
    ['Dual Flight Time:', formatSecondsToHMS(stats.totalDual)],
    ['Instructor Flight Time:', formatSecondsToHMS(stats.totalInstructor)],
    ['Day Flight Time:', formatSecondsToHMS(stats.totalDay)],
    ['Night Flight Time:', formatSecondsToHMS(stats.totalNight)]
  ];
  
  timeStats.forEach(([label, value]) => {
    doc.text(label, leftX, y);
    doc.text(value, rightX, y);
    y += 7;
  });

  y += 3;
  doc.setDrawColor(100);
  doc.line(leftX, y, 195, y);
  y += 7;

  doc.setFontSize(12);
  doc.text('Total Flights per Conditions', leftX, y);
  doc.setDrawColor(180);
  doc.line(100, y - 3, 100, y + 49);
  y += 7;
  doc.setFontSize(11);

  const conditionStats = [
    ['Total Flights:', stats.totalFlights],
    ['Total Landings:', stats.totalLandings],
    ['Total Takeoffs:', stats.totalTakeoffs],
    ['Different UAVs:', stats.uavSet.size],
    ['Flights in VLOS Conditions:', stats.opsCounts['VLOS'] || 0],
    ['Flights in BVLOS Conditions:', stats.opsCounts['BVLOS'] || 0],
    ['Flights in EVLOS Conditions:', stats.opsCounts['EVLOS'] || 0],
    ['Flights PIC:', stats.pilotTypeCounts['PIC'] || 0],
    ['Flights Dual:', stats.pilotTypeCounts['Dual'] || 0],
    ['Flights Instruction:', stats.pilotTypeCounts['Instruction'] || 0]
  ];

  conditionStats.forEach(([label, value]) => {
    doc.text(label, leftX, y);
    doc.text(String(value), rightX, y);
    y += 7;
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.text(`Export Date: ${new Date().toLocaleString()}`, leftX, pageHeight - 10);

  doc.addPage('landscape');

  const columns = [
    { header: 'Date', dataKey: 'departure_date' },
    { header: 'UAV', dataKey: 'uav' },
    { header: 'T/O Place', dataKey: 'departure_place' },
    { header: 'T/O Time', dataKey: 'departure_time' },
    { header: 'LDG Place', dataKey: 'landing_place' },
    { header: 'LDG Time', dataKey: 'landing_time' },
    { header: 'Duration (min)', dataKey: 'flight_duration_min' },
    { header: 'T/O', dataKey: 'takeoffs' },
    { header: 'LDG', dataKey: 'landings' },
    { header: 'Pilot Type', dataKey: 'pilot_type' },
    { header: 'Light', dataKey: 'light_conditions' },
    { header: 'OPS', dataKey: 'ops_conditions' },
    { header: 'Comments', dataKey: 'comments' }
  ];

  const rows = flightLogs.map(log => ({
    departure_date: log.departure_date,
    uav: getUAVName(log.uav),
    departure_place: log.departure_place,
    departure_time: log.departure_time,
    landing_place: log.landing_place,
    landing_time: log.landing_time,
    flight_duration_min: log.flight_duration ? (log.flight_duration / 60).toFixed(1) : '',
    takeoffs: log.takeoffs,
    landings: log.landings,
    pilot_type: log.pilot_type,
    light_conditions: log.light_conditions,
    ops_conditions: log.ops_conditions,
    comments: log.comments || ''
  }));

  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => row[col.dataKey])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 110, 253] },
    margin: { top: 20 },
    didDrawPage: (data) => {
      doc.setFontSize(14);
      doc.text('Flight Log Entries', 14, 15);
    }
  });

  doc.save('flightlog_export.pdf');
};
