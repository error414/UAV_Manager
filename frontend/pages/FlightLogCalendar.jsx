import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import { Layout, Alert, Button, Loading } from '../components';
import { useApi, removeSearchParam } from '../hooks';

const localizer = momentLocalizer(moment)

 const darkDistinctColors = [
    '#e6194b', // red
    '#3cb44b', // green
    '#0082c8', // blue
    '#f58231', // orange
    '#911eb4', // purple
    '#f032e6', // magenta
    '#008080', // teal
    '#aa6e28', // brown
    '#800000', // maroon
    '#808000', // olive
    '#000080', // navy
    '#808080', // gray
    '#dc143c', // crimson
    '#4b0082', // indigo
    '#2e8b57', // sea green
    '#483d8b', // dark slate blue
    '#8b0000', // dark red
    '#006400', // dark green
    '#2f4f4f', // dark slate gray
    '#191970', // midnight blue
];

const FlightlogCalendar = () => {

    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('month');
    const [currentDate, setCurrentDate] = useState(undefined);  
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { fetchData } = useApi(API_URL, setError);
    
    const [flightLogs, setFlightLogs] = useState([]);
    const [aicraftsColor, setAicraftsColor] = useState([]);
    const [events, setEvents] = useState([]);
    

    // init
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const calendarDefaultDate = searchParams.get('calendar_defaultDate') != null ? new Date(searchParams.get('calendar_defaultDate')) : new Date();
        const year = calendarDefaultDate.getUTCFullYear(); 
        const month = String(calendarDefaultDate.getUTCMonth() + 1).padStart(2, '0');
        
        setCurrentDate(calendarDefaultDate);
        navigate(`${location.pathname}`+removeSearchParam(location.search, 'calendar_defaultDate'), { replace: true });

        initFetchAllData( `${year}-${month}`);
    }, []);

    //
    const initFetchAllData = useCallback(async (dateMonth) => {
        await fetchAicrafts();
        await fetchFlightLogsForMonth(dateMonth);
    });   

    //
    const fetchAicrafts = useCallback(async () => {   
        setIsLoading(true);
        const queryParams = {
            page_size: -1,
        };

        const result = await fetchData('/api/uavs/', queryParams);
        if (result.error) {
            setError('Failed to aicrafts  list');
            setIsLoading(false);
            return;
        }

        const aicrafts = result.data.results || [];

        var aircraftsColor = {};
        aicrafts.map(aicraft => {
            aircraftsColor[aicraft.uav_id] = darkDistinctColors[aicraft.uav_id % darkDistinctColors.length];
        });
        
        setAicraftsColor(aircraftsColor);
        setIsLoading(false);  
    }, [fetchData]);

    //
    const fetchFlightLogsForMonth = useCallback(async (dateMonth) => {      
        setIsLoading(true);
        const queryParams = {
            page_size: -1,
            departure_date: dateMonth
        };

        const result = await fetchData('/api/flightlogs/', queryParams);
        if (result.error) {
            setError('Failed to fetch flight list');
            setIsLoading(false);
            return;
        }

        const flighLogs = result.data.results || [];
        setFlightLogs(flighLogs)
        setIsLoading(false);  
    }, [fetchData]);

    //////////////////////////////////
    // calendar controls 

    //click to event in calendar
    const handleSelectedEvent = (event) => {
        navigate(`/flightdetails/${event.id}/`+removeSearchParam(location.search, 'calendar_defaultDate'))
    };

    //click to control button in calendar
    const handleNavigate = (date) => {
        //fetch flight logs for month
        const year = date.getUTCFullYear(); 
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        fetchFlightLogsForMonth( `${year}-${month}`);

        //workdown for calendar button
        setCurrentDate(date);
    };

    // fill events for calendar
    useEffect(() => {
        const events = flightLogs.map(flight => {
            const startDateTimeStr = `${flight.departure_date}T${flight.departure_time}`;
            const endDateTimeStr = `${flight.departure_date}T${flight.landing_time}`;
            return {
                id: flight.flightlog_id,
                title: `${flight.uav.drone_name} ${flight.comments} (${flight.departure_time})`,
                start: new Date(startDateTimeStr),
                end: new Date(endDateTimeStr),
                hexColor: aicraftsColor[flight.uav.uav_id] ?? aicraftsColor[0],
            };
        });
        setEvents(events);
    }, [flightLogs]);

    const eventStyleGetter = (event, start, end, isSelected) => {
        var style = {
            backgroundColor: event.hexColor,
            borderRadius: '0px',
            opacity: 0.8,
            color: 'var(--color-gray-300);',
            border: '0px',
            display: 'block'
        };
        return {
            style: style
        };
    };

    return (
        <Layout title="Flight Log Calendar">
           <Alert type="error" message={error} />
            {isLoading ? (
                <Loading message="Loading calendar data..." />
            ) : (
                <>
                    <div style={{ height: '100%' }}>
                        <Calendar
                            localizer={localizer}
                            startAccessor="start"
                            endAccessor="end"
                            onView={setCurrentView}
                            view={currentView}
                            date={currentDate}
                            onNavigate={handleNavigate}
                            views={{ month: true}}
                            events={events}
                            onSelectEvent={(event) => handleSelectedEvent(event)}
                            defaultDate={currentDate}
                            eventPropGetter={eventStyleGetter}
                            popup={true}
                        />
                    </div>

                <div className="mt-6 flex justify-center gap-4 flex-wrap">
                    <Button 
                        onClick={() => {
                            const search = location.search || '';
                            navigate(`/flightlog/`+removeSearchParam(location.search, 'calendar_defaultDate'));
                        }} 
                        variant="secondary"
                    >
                    Back to Flight Log
                    </Button>
                </div>
            </>
            )}
    </Layout>
  );

}

export default FlightlogCalendar;