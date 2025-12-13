import React from 'react';

// --- Reusable Spinner Component ---
const Spinner = () => (
    <div className="flex items-center justify-center space-x-1 h-6">
        <div className="scanner-bar" style={{ animationDelay: '-0.4s' }}></div>
        <div className="scanner-bar" style={{ animationDelay: '-0.2s' }}></div>
        <div className="scanner-bar"></div>
    </div>
);

// --- API Helper ---
const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // The response is returned directly to the caller for handling
    return fetch(url, { ...options, headers });
};

// --- Login Panel Component ---
const LoginPanel = ({ onLoginSuccess }) => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState(null);
    const [isLoggingIn, setIsLoggingIn] = React.useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoggingIn(true);
        const endpoint = '/api/auth/login';
        try {
            const response = await authenticatedFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            // Store the token
            localStorage.setItem('token', data.token);
            onLoginSuccess(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-black bg-opacity-50 backdrop-blur-xl rounded-2xl border border-cyan-500/50 shadow-cyan-glow p-8" style={{ animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                <h1 className="text-5xl font-bold text-cyan-400 mb-6 text-center" style={{ animation: 'text-cyan-glow-pulse 4s infinite ease-in-out' }}>Officer Login</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-cyan-300 mb-2">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.5)] focus:ring-0 focus:outline-none text-white text-lg transition-shadow" required autoFocus />
                    </div>
                    <div>
                        <label className="block text-cyan-300 mb-2">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.5)] focus:ring-0 focus:outline-none text-white text-lg transition-shadow" required />
                    </div>
                    {error && <p className="text-red-400 bg-red-900/50 border border-red-500 rounded p-2 text-center">{error}</p>}
                    <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center items-center gap-2 bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-3 px-6 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black hover:shadow-[0_0_15px_rgba(217,70,239,0.8)] active:scale-95 active:shadow-[0_0_25px_rgba(217,70,239,1)] disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoggingIn ? <><Spinner /> Authenticating...</> : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Climate Control Component ---
const ClimatePanel = ({ currentUser }) => {
    const [status, setStatus] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [tempInput, setTempInput] = React.useState("");

    const fetchStatus = async () => {
        try {
            const response = await authenticatedFetch('/api/climate/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setStatus(data);
            if (document.activeElement.id !== 'temp-input') {
                setTempInput(data.temperature);
            }
            setError(null);
        } catch (e) {
            setError(`Climate API Error: ${e.message}. Is the climate server running?`);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchStatus();
        // Polling removed to rely on action-based updates.
    }, []);

    const sendControlCommand = async (action, value) => {
        setError(null);
        try {
            const response = await authenticatedFetch('/api/climate/control', {
                method: 'POST',
                body: JSON.stringify({ action, value }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Control command failed');
            }
            // Fetch status for this panel and trigger global status update
            await fetchStatus();
            window.dispatchEvent(new Event('app-state-changed'));
        } catch (e) {
            setError(e.message);
        }
    };

    const handleSetTemperature = () => {
        const temp = parseInt(tempInput, 10);
        if (!isNaN(temp)) {
            sendControlCommand('set_temperature', temp);
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-cyan-400 flex justify-center items-center gap-4"><Spinner /> Loading Climate Data...</div>;
    }

    return (
        <div className="w-full h-full relative pb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-8 text-center" style={{ animation: 'text-cyan-glow-pulse 4s infinite ease-in-out' }}>Environmental Control</h2>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-3xl text-center">
                {error && <div className="bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg inline-block" role="alert">{error}</div>}
            </div>

            {status && (
                <div className="mb-8 p-6 bg-black/30 rounded-xl border border-fuchsia-500/50 shadow-fuchsia-glow" style={{ animation: 'fuchsia-glow-pulse 4s infinite ease-in-out' }}>
                    <h3 className="text-3xl font-semibold text-fuchsia-400 mb-4" style={{ animation: 'text-fuchsia-glow-pulse 4s infinite ease-in-out' }}>System Status</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-lg text-gray-400">Temperature</p>
                            <p className="text-3xl font-bold text-cyan-300">{status.temperature}°C</p>
                        </div>
                        <div>
                            <p className="text-lg text-gray-400">HVAC</p>
                            <p className="text-3xl font-bold text-cyan-300 capitalize">{status.hvac_mode}</p>
                        </div>
                        <div>
                            <p className="text-lg text-gray-400">Lights</p>
                            <p className="text-3xl font-bold text-cyan-300">{status.lights_on ? 'On' : 'Off'}</p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-3xl font-semibold text-fuchsia-400 mb-4" style={{ animation: 'text-fuchsia-glow-pulse 4s infinite ease-in-out' }}>Manual Override</h3>
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <label htmlFor="temp-input" className="font-medium text-gray-300 w-32 text-lg">Temperature:</label>
                        <input
                            id="temp-input"
                            type="number"
                            value={tempInput}
                            onChange={(e) => setTempInput(e.target.value)}
                            className="flex-grow p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.5)] focus:ring-0 focus:outline-none text-white text-lg transition-shadow"
                        />
                        <button onClick={handleSetTemperature} className="bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_15px_rgba(0,255,255,0.8)] active:scale-95">
                            Set
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <label className="font-medium text-gray-300 w-32 text-lg">HVAC Mode:</label>
                        <div className="flex-grow grid grid-cols-3 gap-2">
                            <button onClick={() => sendControlCommand('set_hvac_mode', 'heat')} className={`py-2 px-4 rounded-md transition-all duration-300 ${status?.hvac_mode === 'heat' ? 'bg-red-500 text-white shadow-[0_0_10px_#ef4444]' : 'bg-gray-700/50 hover:bg-gray-600/80'}`} style={status?.hvac_mode === 'heat' ? { animation: 'pulse-red 2s infinite ease-in-out' } : {}}>
                                Heat
                            </button>
                            <button onClick={() => sendControlCommand('set_hvac_mode', 'cool')} className={`py-2 px-4 rounded-md transition-all duration-300 ${status?.hvac_mode === 'cool' ? 'bg-cyan-400 text-black shadow-[0_0_10px_#22d3ee]' : 'bg-gray-700/50 hover:bg-gray-600/80'}`} style={status?.hvac_mode === 'cool' ? { animation: 'pulse-cyan 2s infinite ease-in-out' } : {}}>
                                Cool
                            </button>
                            <button onClick={() => sendControlCommand('set_hvac_mode', 'off')} className={`py-2 px-4 rounded-md transition-all duration-300 ${status?.hvac_mode === 'off' ? 'bg-gray-600 text-white' : 'bg-gray-700/50 hover:bg-gray-600/80'}`}>
                                Off
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <label className="font-medium text-gray-300 w-32 text-lg">Lighting:</label>
                        <div className="flex-grow grid grid-cols-2 gap-2">
                            <button onClick={() => sendControlCommand('set_lights', 'on')} className={`py-2 px-4 rounded-md transition-all duration-300 ${status?.lights_on ? 'bg-yellow-300 text-black shadow-[0_0_10px_#fde047]' : 'bg-gray-700/50 hover:bg-gray-600/80'}`} style={status?.lights_on ? { animation: 'pulse-yellow 2s infinite ease-in-out' } : {}}>
                                On
                            </button>
                            <button onClick={() => sendControlCommand('set_lights', 'off')} className={`py-2 px-4 rounded-md transition-all duration-300 ${!status?.lights_on ? 'bg-gray-600 text-white' : 'bg-gray-700/50 hover:bg-gray-600/80'}`}>
                                Off
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Parking Control Component ---
const ParkingPanel = ({ currentUser }) => {
    const [spots, setSpots] = React.useState([]);
    const [myReservations, setMyReservations] = React.useState([]);
    const [selectedSpot, setSelectedSpot] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [message, setMessage] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    const fetchParkingData = async () => {
        try {
            const [spotsRes, reservationsRes] = await Promise.all([
                authenticatedFetch('/api/parking/all-spots'),
                authenticatedFetch('/api/parking/my-reservations', {
                    method: 'POST',
                })
            ]);

            if (!spotsRes.ok) throw new Error('Failed to fetch spots data');
            if (!reservationsRes.ok) throw new Error('Failed to fetch reservations');

            const spotsData = await spotsRes.json();
            const reservationsData = await reservationsRes.json();

            setSpots(spotsData);
            setMyReservations(reservationsData);
            setError(null);
        } catch (e) {
            setError(`Parking API Error: ${e.message}. Is the parking server running?`);
        } finally {
            setLoading(false);
        }
    };
    React.useEffect(() => {
        fetchParkingData();
    }, []);

    const handleReserveSpot = async () => {
        if (!selectedSpot) return setError("A spot must be selected to reserve.");

        try {
            const response = await authenticatedFetch('/api/parking/reserve', {
                method: 'POST',
                body: JSON.stringify({ id: selectedSpot.id })
            });
            const responseText = await response.text();
            if (!response.ok) throw new Error(responseText);
            setMessage(responseText);
            setTimeout(() => setMessage(null), 3000);
            window.dispatchEvent(new Event('app-state-changed'));
            await fetchParkingData();
            setSelectedSpot(null);
        } catch (e) {
            setError(`Reservation failed: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleCheckIn = async (spotId) => {
        try {
            const response = await authenticatedFetch('/api/parking/checkin', {
                method: 'POST',
                body: JSON.stringify({ id: spotId })
            });
            const responseText = await response.text();
            if (!response.ok) throw new Error(responseText);
            setMessage(responseText);
            setTimeout(() => setMessage(null), 3000);
            window.dispatchEvent(new Event('app-state-changed'));
            await fetchParkingData();
        } catch (e) {
            setError(`Check-in failed: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleUnreserveSpot = async (spotId) => {
        try {
            const response = await authenticatedFetch('/api/parking/unreserve', {
                method: 'POST',
                body: JSON.stringify({ id: spotId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Un-reservation failed');
            setMessage(data.message);
            setTimeout(() => setMessage(null), 3000);
            window.dispatchEvent(new Event('app-state-changed'));
            await fetchParkingData();
        } catch (e) {
            setError(`Un-reservation failed: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleClearSpot = async (spotId) => {
        if (!confirm(`Are you sure you want to clear spot ${spotId}? This will remove any check-in and reservation.`)) {
            return;
        }
        try {
            const response = await authenticatedFetch(`/api/parking/clear-spot/${spotId}`, {
                method: 'POST',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to clear spot.');
            setMessage(data.message);
            setTimeout(() => setMessage(null), 3000);
            window.dispatchEvent(new Event('app-state-changed'));
            await fetchParkingData();
        } catch (e) {
            setError(`Failed to clear spot: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        }
    };

    const Spot = ({ spot }) => {
        let spotClass = 'border-gray-700/50 bg-black/50';
        let icon = '🚗';
        let isClickable = false;
        let animationStyle = {};
        let textClass = 'text-gray-500';

        if (spot.status === 'available') {
            spotClass = 'border-green-400/50 hover:border-green-300 hover:bg-green-900/50 cursor-pointer';
            icon = '🅿️';
            isClickable = true;
            animationStyle = { animation: 'pulse-green-border 2.5s infinite ease-in-out' };
            textClass = 'text-green-300 text-shadow-green';
        } else if (spot.status === 'reserved') {
            spotClass = `border-fuchsia-500/50 bg-fuchsia-900/30 ${spot.user === currentUser.username ? 'ring-2 ring-fuchsia-400 shadow-[0_0_10px_#d946ef]' : ''}`;
            icon = 'Reserved';
            textClass = 'text-fuchsia-300 text-shadow-fuchsia';
        } else if (spot.status === 'occupied') {
            // Style for occupied spots
            spotClass = `border-red-500/50 bg-red-900/40 ${spot.user === currentUser.username ? 'ring-2 ring-fuchsia-400 shadow-[0_0_10px_#d946ef]' : ''}`;
            icon = '🚗';
            textClass = 'text-red-300';
        }

        if (selectedSpot && selectedSpot.id === spot.id) {
            spotClass += ' ring-4 ring-cyan-400';
        }

        return (
            <div
                className={`relative rounded-lg p-2 text-center transition-all duration-200 border ${spotClass} flex flex-col justify-center items-center h-24 group`}
                style={animationStyle}
                onClick={() => isClickable && setSelectedSpot(spot)}>
                <div className="text-3xl">{icon}</div>
                <div className={`font-mono text-lg mt-1 ${textClass}`}>{spot.id}</div>
                {spot.user && (
                    <div className="text-xs text-gray-400 truncate w-full px-1">{spot.user}</div>
                )}
                {(spot.status === 'occupied' || spot.status === 'reserved') && currentUser.role === 'admin' && (
                    <button onClick={(e) => { e.stopPropagation(); handleClearSpot(spot.id); }} className="absolute bottom-1 right-1 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Clear
                    </button>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="text-center p-10 text-fuchsia-400 flex justify-center items-center gap-4"><Spinner /> Loading Parking Data...</div>;
    }

    return (
        <div className="w-full h-full relative">
            <h2 className="text-4xl md:text-5xl font-bold text-fuchsia-400 mb-8 text-center" style={{ animation: 'text-fuchsia-glow-pulse 5s infinite ease-in-out' }}>Parking Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow" style={{ animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                    <h3 className="text-2xl font-semibold text-cyan-400 mb-4 text-center" style={{ animation: 'text-cyan-glow-pulse 4s infinite ease-in-out' }}>Parking Lot Status</h3>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                        {spots.map(spot => <Spot key={spot.id} spot={spot} />)}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow" style={{ animation: 'fuchsia-glow-pulse 5s infinite ease-in-out' }}>
                        <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Reserve a Spot</h3>
                        {selectedSpot ? (
                            <div className="text-center">
                                <p className="text-lg">Selected Spot: <span className="font-bold text-cyan-300 text-2xl">{selectedSpot.id}</span></p>
                                <p className="text-gray-400 mb-4">Status: <span className="capitalize">{selectedSpot.status}</span></p>
                                <button onClick={handleReserveSpot} className="w-full bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-6 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black hover:shadow-[0_0_15px_rgba(217,70,239,0.8)] active:scale-95">Confirm Reservation</button>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">Click an available spot on the map to begin.</p>
                        )}
                    </div>
                    <div className="relative">
                        <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow" style={{ animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                            <h3 className="text-2xl font-semibold text-cyan-400 mb-4">My Reservations</h3>
                            <div className="space-y-2">
                                {myReservations && myReservations.length > 0 ? myReservations.map(spotId => (
                                    <div key={spotId} className="flex justify-between items-center bg-cyan-900/50 p-2 rounded-md">
                                        <span className="text-cyan-300 font-mono text-lg">Spot {spotId}</span>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleUnreserveSpot(spotId)} className="bg-transparent border border-red-500 text-red-400 text-sm font-bold py-1 px-3 rounded-md transition-all duration-300 hover:bg-red-500 hover:text-white active:scale-95">Unreserve</button>
                                            <button onClick={() => handleCheckIn(spotId)} className="bg-transparent border border-fuchsia-400 text-fuchsia-400 text-sm font-bold py-1 px-3 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black hover:shadow-[0_0_10px_rgba(217,70,239,0.8)] active:scale-95">Check In</button>
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500 text-center">No reservations found for '{currentUser.username}'.</p>}
                                {/* Alerts are positioned absolutely below the "My Reservations" box */}
                                {error && <div className="absolute w-full mt-2 bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg" role="alert">{error}</div>}
                                {message && <div className="absolute w-full mt-2 bg-green-900/80 border border-green-500 text-green-300 px-4 py-2 rounded-lg" role="alert">{message}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Automation Control Component ---
const AutomationPanel = ({ currentUser }) => {
    const [rules, setRules] = React.useState([]);
    const [energySavings, setEnergySavings] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [message, setMessage] = React.useState(null);

    const [sceneName, setSceneName] = React.useState('focus_mode');
    const [sceneSettings, setSceneSettings] = React.useState('{"lights": "dim", "temperature": 22}');
    const [motionArea, setMotionArea] = React.useState('main_office');

    const fetchData = async () => {
        try {
            const [rulesRes, savingsRes] = await Promise.all([
                authenticatedFetch('/api/automation/rules'),
                authenticatedFetch('/api/automation/energy-savings')
            ]);

            if (!rulesRes.ok) throw new Error('Failed to fetch automation rules');
            if (!savingsRes.ok) throw new Error('Failed to fetch energy savings');

            const rulesData = await rulesRes.json();
            const savingsData = await savingsRes.json();

            setRules(rulesData);
            setEnergySavings(savingsData);
            setError(null);
        } catch (e) {
            setError(`Automation API Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
        // Polling removed to rely on action-based updates.
    }, []);

    const handleApiCall = async (method, endpoint, body, successMessage) => {
        setError(null);
        setMessage(null);
        try {
            const response = await authenticatedFetch(endpoint, {
                method: method,
                body: body ? JSON.stringify(body) : undefined,
            });
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || 'API call failed');
            }
            setMessage(successMessage);
            setTimeout(() => setMessage(null), 5000);
            window.dispatchEvent(new Event('app-state-changed'));
            await fetchData(); // Refresh data after action
        } catch (e) {
            setError(e.message);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleToggleRule = (ruleId) => {
        handleApiCall('POST', `/api/automation/rules/toggle/${ruleId}`, {}, 'Rule toggled!');
    };

    const handleTestRule = (rule) => {
        handleApiCall('POST', `/api/automation/rules/test/${rule.id}`, {}, `Test triggered for rule #${rule.id}.`);
    };

    const handleDeleteRule = (ruleId) => {
        if (confirm(`Are you sure you want to delete automation rule #${ruleId}? This cannot be undone.`)) {
            handleApiCall('DELETE', `/api/automation/rules/delete/${ruleId}`, null, `Rule #${ruleId} deleted.`);
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-green-400 flex justify-center items-center gap-4"><Spinner /> Loading Automation Data...</div>;
    }

    const AdminRuleActions = ({ rule }) => (
        <div className="flex items-center space-x-2 ml-4">
            <button onClick={() => handleTestRule(rule)} className="bg-transparent border border-cyan-400 text-cyan-400 text-sm font-bold py-1 px-3 rounded-md transition-all duration-300 hover:bg-cyan-400 hover:text-black active:scale-95">Test</button>
            <button onClick={() => handleToggleRule(rule.id)} className={`py-1 px-3 rounded-md text-sm transition-all duration-300 active:scale-95 ${rule.active ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}>{rule.active ? 'On' : 'Off'}</button>
            <button onClick={() => handleDeleteRule(rule.id)} className="py-1 px-3 rounded-md text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all duration-300 active:scale-95">Delete</button>
        </div>
    );

    const renderRuleList = () => (
        <div className="space-y-3 h-64 overflow-y-auto pr-2">
            {rules.length > 0 ? rules.map(rule => (
                <div key={rule.id} className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex-grow">
                        <p className="font-semibold text-cyan-300">{rule.description}</p>
                        <p className="text-xs text-gray-400 font-mono">ID: {rule.id} | Trigger: {rule.trigger.type}</p>
                    </div>
                    {currentUser.role === 'admin' && <AdminRuleActions rule={rule} />}
                </div>
            )) : <p className="text-gray-500 text-center mt-4">No rules defined.</p>}
        </div>
    );

    return (
        <div className="w-full h-full relative pb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-green-400 mb-8 text-center" style={{ animation: 'text-green-glow-pulse 6s infinite ease-in-out' }}>Automation Hub</h2>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-3xl text-center space-y-2">
                {error && <div className="bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg inline-block" role="alert">{error}</div>}
                {message && <div className="bg-green-900/80 border border-green-500 text-green-300 px-4 py-2 rounded-lg inline-block" role="alert">{message}</div>}
            </div>

            {currentUser.role === 'admin' && <CreateRuleForm currentUser={currentUser} onRuleCreated={fetchData} />}
            <div className="space-y-6">
                <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow" style={{ animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                    <h3 className="text-xl font-semibold text-cyan-400 mb-3 text-center">Energy Savings</h3>
                    {energySavings ? (
                        <div className="text-center">
                            <p className="text-gray-400">HVAC Reduced: <span className="font-bold text-cyan-300">{energySavings.hvac_runtime_reduced_hours} hrs</span></p>
                            <p className="text-gray-400">Lights Off: <span className="font-bold text-cyan-300">{energySavings.lights_off_hours} hrs</span></p>
                        </div>
                    ) : <p className="text-gray-500">No data.</p>}
                </div>
                <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow" style={{ animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                    <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Active Rules</h3>
                    {renderRuleList()}
                </div>
            </div>
        </div>
    );
};

// --- Create Rule Form (Admin Only) ---
const CreateRuleForm = ({ currentUser, onRuleCreated }) => {
    const [allUsers, setAllUsers] = React.useState([]);
    const [triggerType, setTriggerType] = React.useState('motion');
    const [triggerConditionKey, setTriggerConditionKey] = React.useState('area');
    const [triggerConditionValue, setTriggerConditionValue] = React.useState('main_office');
    const [actionType, setActionType] = React.useState('lights_on');
    const [actionParams, setActionParams] = React.useState({});
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        // Fetch users for the user_login condition dropdown
        const fetchUsers = async () => {
            try {
                const response = await authenticatedFetch('/api/users/all');
                if (response.ok) {
                    const data = await response.json();
                    setAllUsers(data);
                }
            } catch (e) { console.error("Failed to fetch users for automation form", e); }
        };
        fetchUsers();
    }, []);

    const handleActionChange = (e) => {
        const newAction = e.target.value;
        setActionType(newAction);
        // Reset params when action changes
        setActionParams({});
    };

    const handleTriggerChange = (e) => {
        const newTrigger = e.target.value;
        setTriggerType(newTrigger);
        // Reset conditions when trigger type changes
        if (newTrigger === 'motion') {
            setTriggerConditionKey('area');
            setTriggerConditionValue('main_office');
        } else if (newTrigger === 'user_login') {
            setTriggerConditionKey('username');
            setTriggerConditionValue(allUsers[0]?.username || '');
        } else if (newTrigger === 'parking_checkin') {
            setTriggerConditionKey('spot_id');
            setTriggerConditionValue('1');
        } else if (newTrigger === 'time') {
            setTriggerConditionKey('time');
            setTriggerConditionValue('19:00');
        }
    };

    const generateDescription = () => {
        let actionText = actionType.replace(/_/g, ' ');
        if (actionParams.spot_id) {
            actionText += ` for spot ${actionParams.spot_id}`;
        }
        if (triggerType === 'motion') return `When motion is detected in '${triggerConditionValue}', ${actionText}.`;
        if (triggerType === 'user_login') return `When user '${triggerConditionValue}' logs in, ${actionText}.`;
        if (triggerType === 'parking_checkin') return `When someone checks into parking spot ${triggerConditionValue}, ${actionText}.`;
        if (triggerType === 'time') return `At ${triggerConditionValue} every day, ${actionText}.`;
        return 'Custom rule';
    };

    const handleCreateRule = async (e) => {
        e.preventDefault();

        const rule = {
            trigger: { type: triggerType, condition: { [triggerConditionKey]: triggerConditionValue } },
            action: { type: actionType, parameters: actionParams },
            description: generateDescription()
        };

        try {
            const response = await authenticatedFetch('/api/automation/rules/create', {
                method: 'POST',
                body: JSON.stringify(rule)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create rule');
            onRuleCreated(); // Notify parent to refresh
            // No message here, parent will show it.
        } catch (err) {
            // Error will be handled by parent component
        }
    };

    const renderConditionInput = () => {
        if (triggerType === 'user_login') {
            return <select value={triggerConditionValue} onChange={e => setTriggerConditionValue(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 cyber-select">{allUsers.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}</select>;
        }
        if (triggerType === 'time') {
            return <input type="time" value={triggerConditionValue} onChange={e => setTriggerConditionValue(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)]" />;
        }
        return <input type="text" value={triggerConditionValue} onChange={e => setTriggerConditionValue(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)]" />;
    };

    const renderActionParamsInput = () => {
        if (actionType === 'reserve_parking' || actionType === 'clear_parking') {
            return (
                <div>
                    <label className="block text-fuchsia-300 mb-1 text-sm">Spot ID</label>
                    <input
                        type="number"
                        value={actionParams.spot_id || ''}
                        onChange={e => setActionParams({ ...actionParams, spot_id: e.target.value })}
                        className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)]"
                        placeholder="e.g., 1"
                        required
                    />
                </div>
            );
        }
        return <div />; // Return an empty div to maintain grid layout
    };

    return (
        <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow mb-6">
            <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Create New Automation Rule</h3>
            <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-white">
                <div>
                    <label className="block text-fuchsia-300 mb-1 text-sm">Trigger</label>
                    <select value={triggerType} onChange={handleTriggerChange} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 cyber-select"><option value="motion">Motion Detected</option><option value="user_login">User Logs In</option><option value="parking_checkin">Parking Check-in</option><option value="time">Time of Day</option></select>
                </div>
                <div>
                    <label className="block text-fuchsia-300 mb-1 text-sm">Condition</label>
                    {renderConditionInput()}
                </div>
                <div>
                    <label className="block text-fuchsia-300 mb-1 text-sm">Action</label>
                    <select value={actionType} onChange={handleActionChange} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 cyber-select"><option value="lights_on">Turn Lights On</option><option value="lights_off">Turn Lights Off</option><option value="hvac_off">Turn HVAC Off</option><option value="reserve_parking">Reserve Parking</option><option value="clear_parking">Clear Parking</option></select>
                </div>
                {renderActionParamsInput()}
                <button type="submit" className="bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black active:scale-95 self-end h-11">Create Rule</button>
            </form>
            {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
    );
};

// --- Users Management Panel (Admin Only) ---
const UsersPanel = ({ currentUser }) => {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [message, setMessage] = React.useState(null);

    // State for the new user form
    const [newUsername, setNewUsername] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [newRole, setNewRole] = React.useState('user');


    const fetchUsers = async () => {
        try {
            const response = await authenticatedFetch('/api/users/all');
            if (!response.ok) throw new Error('Failed to fetch users.');
            const data = await response.json();
            setUsers(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const handleApiCall = async (method, endpoint, body, successCallback) => {
        try {
            const response = await authenticatedFetch(endpoint, {
                method: method,
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API call failed.');
            if (data.message) setMessage(data.message);
            setTimeout(() => setMessage(null), 3000);
            if (successCallback) successCallback();
            await fetchUsers();
        } catch (e) {
            setError(e.message);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleSetRole = (username, role) => {
        handleApiCall('POST', '/api/users/set-role', { username, role: role });
    };
    const handleCreateUser = (e) => {
        e.preventDefault();
        handleApiCall('POST', '/api/users/create', { username: newUsername, password: newPassword, role: newRole }, () => {
            // Clear form on success
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
        });
    };

    const handleChangePassword = (username) => {
        const newPassword = prompt(`Enter new password for ${username}:`);
        if (newPassword && newPassword.trim() !== '') {
            handleApiCall('POST', '/api/users/change-password', { username, password: newPassword });
        }
    };

    const handleDeleteUser = (username) => {
        if (confirm(`Are you sure you want to delete the user "${username}"? This action cannot be undone.`)) {
            handleApiCall('DELETE', `/api/users/delete/${username}`, null);
        }
    };

    if (loading) return <div className="text-center p-10 text-cyan-400 flex justify-center items-center gap-4"><Spinner /> Loading User Data...</div>;

    return (
        <div className="w-full h-full flex flex-col pb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-8 text-center" style={{ animation: 'text-cyan-glow-pulse 4s infinite ease-in-out' }}>User Management</h2>
            <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow mb-6">
                <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)] focus:ring-0 focus:outline-none" required />
                    <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)] focus:ring-0 focus:outline-none" required />
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} className="p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:ring-0 focus:outline-none cyber-select">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black active:scale-95">Create User</button>
                </form>
            </div>
            <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow flex-grow overflow-y-auto pr-2">
                <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Existing Users</h3>
                {users.map(user => (
                    <div key={user.username} className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between mb-3">
                        <div className="flex-grow">
                            <p className="font-semibold text-cyan-300 text-lg">{user.username}</p>
                            <p className="text-sm text-gray-400 capitalize">Role: {user.role}</p>
                        </div>
                        {user.username !== currentUser.username && (
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleChangePassword(user.username)} className="py-1 px-3 rounded-md text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all duration-300 active:scale-95">Password</button>
                                <button onClick={() => handleSetRole(user.username, user.role === 'admin' ? 'user' : 'admin')} className={`py-1 px-3 rounded-md text-sm font-bold transition-all duration-300 active:scale-95 ${user.role === 'admin' ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{user.role === 'admin' ? 'Demote' : 'Promote'}</button>
                                <button onClick={() => handleDeleteUser(user.username)} className="py-1 px-3 rounded-md text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all duration-300 active:scale-95">Delete</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto max-w-3xl text-center space-y-2">
                {error && <div className="bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg inline-block" role="alert">{error}</div>}
                {message && <div className="bg-green-900/80 border border-green-500 text-green-300 px-4 py-2 rounded-lg inline-block" role="alert">{message}</div>}
            </div>
        </div>
    );
};

// --- Digital Clock Component ---
const DigitalClock = () => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const format = (d) => {
        const date = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${date}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }

    return <div className="text-cyan-300 font-mono text-lg">{format(time)}</div>;
};

// --- Meeting Rooms Panel ---
const MeetingRoomsPanel = ({ currentUser }) => {
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diff = d.getDate() - day; // Adjust to Sunday
        const sunday = new Date(d.setDate(diff));
        sunday.setHours(0, 0, 0, 0); // Set to midnight to avoid DST issues
        return sunday;
    };

    const checkOverlap = (newBooking) => {
        const newStart = new Date(newBooking.start_time);
        const newEnd = new Date(newStart.getTime() + newBooking.duration_minutes * 60000);

        for (const existing of bookings) {
            if (existing.room_id !== newBooking.room_id) continue;

            const existingStart = new Date(existing.start_time);
            const existingEnd = new Date(existing.end_time);

            if (newStart < existingEnd && newEnd > existingStart) {
                return true; // Found an overlap
            }
        }
        return false; // No overlap
    };

    const [rooms, setRooms] = React.useState([]);
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [message, setMessage] = React.useState(null);
    const [currentWeekStart, setCurrentWeekStart] = React.useState(getStartOfWeek(new Date()));

    // Booking form state
    const [bookingRoomId, setBookingRoomId] = React.useState('');
    const [bookingDate, setBookingDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = React.useState('09:00');
    const [bookingDuration, setBookingDuration] = React.useState(60);

    const fetchData = async () => {
        // This function is now self-contained and handles its own loading state.
        setLoading(true);
        try {
            const weekStartISO = new Date(currentWeekStart.setHours(0, 0, 0, 0)).toISOString();

            const [roomsRes, bookingsRes] = await Promise.all([
                authenticatedFetch('/api/rooms/status'),
                authenticatedFetch(`/api/rooms/bookings-for-week?start_date=${weekStartISO}`)
            ]);

            if (!roomsRes.ok) throw new Error('Failed to fetch room status');
            if (!bookingsRes.ok) throw new Error('Failed to fetch weekly bookings');

            const roomsData = await roomsRes.json();
            const bookingsData = await bookingsRes.json();

            // Set default room for booking form if not set
            if (!bookingRoomId && roomsData.length > 0) {
                setBookingRoomId(roomsData[0].id);
            }
            setRooms(roomsData);
            setBookings(bookingsData);
            setError(null);
        } catch (e) {
            setError(`Meeting Rooms API Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [currentWeekStart]);

    const handleApiCall = async (method, endpoint, body, successMessage) => {
        let responseData;
        try {
            const response = await authenticatedFetch(endpoint, {
                method: method,
                body: body ? JSON.stringify(body) : undefined,
            });
            responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || 'API call failed');

            if (responseData.message || successMessage) {
                setMessage(responseData.message || successMessage);
                setTimeout(() => setMessage(null), 3000);
            }

            window.dispatchEvent(new Event('app-state-changed'));
        } catch (e) {
            setError(e.message);
            setTimeout(() => setError(null), 5000);
            return null; // Indicate failure
        }
        return responseData; // Return data on success
    };

    const handleBookRoom = async () => {
        const [hours, minutes] = bookingTime.split(':');
        // Create a date object from the input date string (e.g., "2025-09-17")
        // This correctly interprets it in the local timezone at midnight.
        const startDateTime = new Date(`${bookingDate}T00:00:00`);
        // Set the hours and minutes according to the local timezone.
        startDateTime.setHours(hours, minutes, 0, 0);

        const body = {
            room_id: parseInt(bookingRoomId),
            duration_minutes: bookingDuration,
            start_time: startDateTime.toISOString()
        };

        if (checkOverlap(body)) {
            setError("This time slot is already booked or overlaps with an existing booking.");
            setTimeout(() => setError(null), 5000);
            return;
        }

        const responseData = await handleApiCall('POST', '/api/rooms/book', body, null);
        if (responseData?.booking) {
            setBookings(prev => [...prev, responseData.booking]);
        } else {
            console.error("Booking failed, re-syncing calendar.");
            fetchData();
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (confirm('Are you sure you want to cancel this booking?')) {
            const responseData = await handleApiCall('POST', `/api/rooms/cancel/${bookingId}`, null, 'Booking cancelled.');
            if (responseData) {
                setBookings(prev => prev.filter(b => b.booking_id !== bookingId));
            }
        }
    };

    const changeWeek = (direction) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (7 * direction));
        setCurrentWeekStart(getStartOfWeek(newDate));
    };

    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const weekDays = Array.from({ length: 5 }).map((_, i) => {
        const day = new Date(currentWeekStart);
        day.setDate(currentWeekStart.getDate() + i);
        return day;
    });

    // --- Data Processing for UI ---
    const roomMap = React.useMemo(() => new Map(rooms.map(room => [room.id, room])), [rooms]);
    const bookingsByDay = React.useMemo(() => {
        const grouped = Array.from({ length: 5 }, () => []);
        if (!Array.isArray(bookings) || !currentWeekStart) return grouped;

        const weekStartMs = currentWeekStart.getTime();

        bookings.forEach(booking => {
            if (!booking || !booking.start_time) return;
            const startDate = new Date(booking.start_time);
            if (isNaN(startDate.getTime())) return;

            // Calculate the difference in days from the start of the currently viewed week.
            const dayIndex = Math.floor((startDate.getTime() - weekStartMs) / (1000 * 60 * 60 * 24));

            // Only add the booking if it falls within the 5-day view (Sunday to Thursday).
            if (dayIndex >= 0 && dayIndex < 5) {
                grouped[dayIndex].push(booking);
            }
        });
        grouped.forEach(day => day.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
        return grouped;
    }, [bookings, currentWeekStart]);

    // --- Color mapping for rooms ---
    const roomColors = [
        'bg-sky-800/80 border-sky-500',      // Room 1
        'bg-emerald-800/80 border-emerald-500', // Room 2
        'bg-amber-800/80 border-amber-500',   // Room 3
        'bg-indigo-800/80 border-indigo-500', // Room 4
    ];

    if (loading) return <div className="text-center p-10 text-orange-400 flex justify-center items-center gap-4"><Spinner /> Loading Meeting Room Data...</div>;

    return (
        <div className="w-full h-full flex flex-col">
            <h2 className="text-4xl md:text-5xl font-bold text-orange-400 mb-8 text-center" style={{ animation: 'text-orange-glow-pulse 4s infinite ease-in-out' }}>Meeting Rooms</h2>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-3xl text-center space-y-2 z-20">
                {error && <div className="bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg inline-block" role="alert">{error}</div>}
                {message && <div className="bg-green-900/80 border border-green-500 text-green-300 px-4 py-2 rounded-lg inline-block" role="alert">{message}</div>}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-grow min-h-0">
                <div className="xl:col-span-3 bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeWeek(-1)} className="text-cyan-400 hover:text-white">‹ Prev Week</button>
                        <h3 className="text-xl font-semibold text-cyan-400">
                            Week of {currentWeekStart.toLocaleDateString('en-CA')}
                        </h3>
                        <button onClick={() => changeWeek(1)} className="text-cyan-400 hover:text-white">Next Week ›</button>
                    </div>
                    <div className="flex-grow overflow-y-auto relative min-h-0">
                        <div className="grid grid-cols-5 h-full">
                            {weekDays.map((day, dayIndex) => (
                                <div key={dayIndex} className="flex flex-col border-l border-gray-700 first:border-l-0">
                                    {/* Day Header: Sticky so it stays visible on scroll. */}
                                    <div className="text-center font-bold text-cyan-300 p-2 border-b border-gray-700 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
                                        {day.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })}
                                    </div>
                                    {/* Bookings for this day */}
                                    <div className="p-2 space-y-2 flex-grow">
                                        {bookingsByDay[dayIndex].length > 0 ? (
                                            bookingsByDay[dayIndex].map(booking => {
                                                const room = roomMap.get(booking.room_id);
                                                const colorClass = room ? roomColors[(room.id - 1) % roomColors.length] : 'bg-gray-700';
                                                const isOwnBooking = booking.username === currentUser.username;
                                                return (
                                                    <div key={booking.booking_id} className={`relative p-2 rounded-lg text-xs group ${isOwnBooking ? 'ring-2 ring-fuchsia-400 ' : ''}${colorClass}`}>
                                                        <p className="font-bold text-white truncate">{room?.name || 'Unknown Room'}</p>
                                                        <p className="text-gray-300 truncate">{booking.username}</p>
                                                        <p className="text-gray-400 text-[10px]">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                                                        {(currentUser.role === 'admin' || isOwnBooking) && (
                                                            <button onClick={() => handleCancelBooking(booking.booking_id)} className="absolute top-1 right-1 text-red-200 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (<div className="text-center text-gray-600 text-sm pt-4">No bookings</div>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow" style={{ animation: 'fuchsia-glow-pulse 5s infinite ease-in-out' }}>
                        <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Book a Room</h3>
                        <div className="space-y-4">
                            <div><label className="block text-fuchsia-300 mb-1">Room</label><select value={bookingRoomId} onChange={e => setBookingRoomId(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 cyber-select" disabled={loading}><option value="" disabled>Select a room...</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-fuchsia-300 mb-1">Date</label><input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)]" /></div>
                                <div><label className="block text-fuchsia-300 mb-1">Time</label><input type="time" step="1800" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 focus:shadow-[0_0_15px_rgba(217,70,239,0.5)]" /></div>
                            </div>
                            <div>
                                <label className="block text-fuchsia-300 mb-1">Duration (minutes)</label>
                                <select value={bookingDuration} onChange={e => setBookingDuration(parseInt(e.target.value))} className="w-full p-2 bg-gray-900/50 border-2 border-gray-600 rounded-md focus:border-fuchsia-400 cyber-select">
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={90}>90 minutes</option>
                                    <option value={120}>120 minutes</option>
                                </select>
                            </div>
                            <button onClick={handleBookRoom} disabled={!bookingRoomId || loading} className="w-full bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-6 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black hover:shadow-[0_0_15px_rgba(217,70,239,0.8)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Confirm Booking</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Wellness Panel ---
const WellnessPanel = ({ currentUser }) => {
    const [checkin, setCheckin] = React.useState({ mood: 5, energy: 5, stress: 5 });
    const [airQuality, setAirQuality] = React.useState(null);
    const [noise, setNoise] = React.useState(null);
    const [ergonomics, setErgonomics] = React.useState(null);
    const [loading, setLoading] = React.useState({ air: false, noise: false, ergo: false, checkin: false });
    const [error, setError] = React.useState(null);
    const [message, setMessage] = React.useState(null);

    React.useEffect(() => {
        // Initial fetch
        fetchAirQuality();
        fetchNoise();

        // Set up interval to fetch every 5 minutes
        const intervalId = setInterval(() => {
            fetchAirQuality();
            fetchNoise();
        }, 300000); // 5 minutes

        return () => clearInterval(intervalId);
    }, []);

    const handleApiCall = async (endpoint, options, loadingKey) => {
        setLoading(prev => ({ ...prev, [loadingKey]: true }));
        setError(null);
        try {
            const response = await authenticatedFetch(endpoint, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API call failed');
            return data;
        } catch (e) {
            setError(e.message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    const fetchAirQuality = async () => {
        const data = await handleApiCall('/api/wellness/air-quality', { method: 'GET' }, 'air');
        if (data) setAirQuality(data);
    };

    const fetchNoise = async () => {
        const data = await handleApiCall('/api/wellness/noise-levels', { method: 'GET' }, 'noise');
        if (data) setNoise(data);
    };

    const checkErgonomics = async () => {
        const data = await handleApiCall('/api/wellness/ergonomics/check', { method: 'GET' }, 'ergo');
        if (data) setErgonomics(data);
    };

    const handleCheckinSubmit = async (e) => {
        e.preventDefault();
        const data = await handleApiCall('/api/wellness/checkin', { method: 'POST', body: JSON.stringify(checkin) }, 'checkin');
        if (data) {
            let finalMessage = data.message;
            if (data.advice && data.advice.length > 0) {
                finalMessage += ` Advice: ${data.advice.join(' ')}`;
            }
            if (data.support_resources && Object.keys(data.support_resources).length > 0) {
                finalMessage += ' We noticed you might need some extra support. Resources have been logged to the console for your privacy.';
                console.log("--- Suggested Support Resources ---");
                for (const [problem, resources] of Object.entries(data.support_resources)) {
                    console.log(`For feeling ${problem}:`);
                    resources.forEach(r => console.log(`- ${r}`));
                }
                console.log("------------------------------------");
            }
            setMessage(finalMessage);
            setTimeout(() => setMessage(null), 10000); // Longer timeout for more text
        }
    };

    const handleMentalHealthSupport = async () => {
        const data = await handleApiCall('/api/wellness/mental-health/support', { method: 'POST', body: JSON.stringify({ problem: 'general' }) }, 'mental');
        if (data) {
            // Use the integrated notification system instead of a disruptive alert and log details to console for privacy.
            setMessage(`${data.message} Emergency contact: ${data.emergency}`);
            console.log("--- Mental Health Support Resources ---");
            data.help.forEach(resource => console.log(`- ${resource}`));
            console.log(`Emergency Contact: ${data.emergency}`);
            console.log("------------------------------------");
            setTimeout(() => setMessage(null), 8000);
        }
    };

    const CyberButtonInput = ({ label, value, onChange }) => (
        <div>
            <label className="block text-fuchsia-300 mb-1 capitalize">{label} ({value})</label>
            <div className="flex justify-between items-center space-x-1 bg-black/20 p-1 rounded-md border border-fuchsia-900">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
                    <button
                        key={level}
                        type="button"
                        onClick={() => onChange(level)}
                        className={`h-8 flex-1 rounded-sm transition-all duration-150 ${value >= level ? 'bg-fuchsia-500 shadow-[0_0_10px_#d946ef]' : 'bg-fuchsia-800/30 hover:bg-fuchsia-700/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );

    const VitalsCard = ({ title, data, onRefresh, loading, children }) => (
        <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-cyan-400">{title}</h3>
                <button onClick={onRefresh} disabled={loading} className="text-cyan-400 hover:text-white disabled:opacity-50 text-2xl">↻</button>
            </div>
            {loading ? <Spinner /> : data ? children(data) : <p className="text-gray-500">Click refresh to load data.</p>}
        </div>
    );

    return (
        <div className="w-full h-full relative pb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-emerald-400 mb-8 text-center" style={{ animation: 'text-green-glow-pulse 5s infinite ease-in-out' }}>Wellness Hub</h2>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-3xl text-center space-y-2 z-20">
                {error && <div className="bg-red-900/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg inline-block" role="alert">{error}</div>}
                {message && <div className="bg-green-900/80 border border-green-500 text-green-300 px-4 py-2 rounded-lg inline-block" role="alert">{message}</div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <VitalsCard title="Air Quality" data={airQuality} onRefresh={fetchAirQuality} loading={loading.air}>
                    {d => <p>CO₂: {d.co2} ppm, Temp: {d.temperature}°C, Humidity: {d.humidity}% <br />Status: <span className="font-bold">{d.status}</span></p>}
                </VitalsCard>
                <VitalsCard title="Noise Level" data={noise} onRefresh={fetchNoise} loading={loading.noise}>
                    {d => <p>Level: {d.noise_db} dB <br />Status: <span className="font-bold">{d.status}</span></p>}
                </VitalsCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow">
                        <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Daily Check-in</h3>
                        <form onSubmit={handleCheckinSubmit} className="space-y-4">
                            <CyberButtonInput label="Mood" value={checkin.mood} onChange={val => setCheckin({ ...checkin, mood: val })} />
                            <CyberButtonInput label="Energy" value={checkin.energy} onChange={val => setCheckin({ ...checkin, energy: val })} />
                            <CyberButtonInput label="Stress" value={checkin.stress} onChange={val => setCheckin({ ...checkin, stress: val })} />
                            <button type="submit" disabled={loading.checkin} className="w-full flex justify-center items-center gap-2 bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-fuchsia-400 hover:text-black disabled:opacity-50">
                                {loading.checkin ? <><Spinner />Submitting...</> : 'Submit Check-in'}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/30 shadow-cyan-glow">
                        <h3 className="text-xl font-semibold text-cyan-400 mb-3">Ergonomics & Breaks</h3>
                        <button onClick={checkErgonomics} disabled={loading.ergo} className="w-full mb-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-cyan-400 hover:text-black active:scale-95">Check My Ergonomics</button>
                        {ergonomics && <div><p className="font-bold">Results:</p><ul className="list-disc list-inside text-cyan-300">{ergonomics.problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-fuchsia-500/30 shadow-fuchsia-glow">
                        <h3 className="text-xl font-semibold text-fuchsia-400 mb-3">Mental Health Support</h3>
                        <p className="text-gray-400 mb-3 text-sm">If you need to talk, resources are available. Click below for immediate, confidential support options.</p>
                        <button onClick={handleMentalHealthSupport} className="w-full bg-fuchsia-600/80 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 hover:bg-fuchsia-500 active:scale-95">Request Support</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Status Line Component ---
const StatusLine = () => {
    const [climateStatus, setClimateStatus] = React.useState(null);
    const [parkingSpots, setParkingSpots] = React.useState([]);
    const [rooms, setRooms] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const fetchData = async () => {
        try {
            const [climateRes, parkingRes, roomsRes] = await Promise.all([
                authenticatedFetch('/api/climate/status'),
                authenticatedFetch('/api/parking/all-spots'),
                authenticatedFetch('/api/rooms/status')
            ]);
            const climateData = climateRes.ok ? await climateRes.json() : null;
            const parkingData = parkingRes.ok ? await parkingRes.json() : [];
            const roomsData = roomsRes.ok ? await roomsRes.json() : [];
            setClimateStatus(climateData);
            setParkingSpots(parkingData);
            setRooms(roomsData);
        } catch (e) {
            console.error("Status line fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
        window.addEventListener('app-state-changed', fetchData);
        return () => window.removeEventListener('app-state-changed', fetchData);
    }, []);

    const availableSpots = parkingSpots.filter(s => s.status === 'available').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;

    // Render placeholders to prevent layout shift
    return (
        <div className="w-full text-center text-lg text-cyan-300/80 flex justify-center items-center space-x-6 font-mono h-7">
            {loading || !climateStatus ? <span>TEMP: --°C</span> : <span>TEMP: {climateStatus.temperature}°C</span>}
            <span className="text-gray-600">|</span>
            {loading || !climateStatus ? <span>LIGHTS: ---</span> : <span>LIGHTS: {climateStatus.lights_on ? 'ON' : 'OFF'}</span>}
            <span className="text-gray-600">|</span>
            {loading || rooms.length === 0 ? <span>ROOMS: -- AVAILABLE</span> : <span>ROOMS: {availableRooms} AVAILABLE</span>}
            <span className="text-gray-600">|</span>
            {loading || parkingSpots.length === 0 ? <span>PARKING: -- SPOTS AVAILABLE</span> : <span>PARKING: {availableSpots} SPOTS AVAILABLE</span>}
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [currentView, setCurrentView] = React.useState('climate');
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        setIsLoggedIn(true);
    };
    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setCurrentUser(null);
    };

    React.useEffect(() => {
        // This effect runs once when the app loads
        const splashScreen = document.getElementById('splash-screen');

        // Set a timer to hide the splash screen after 2.5 seconds
        const timer = setTimeout(() => {
            if (splashScreen) {
                splashScreen.classList.add('hidden');
            }
        }, 2500); // 2.5 seconds

        // Clean up the timer if the component unmounts
        return () => clearTimeout(timer);
    }, []); // The empty dependency array ensures this runs only once

    React.useEffect(() => {
        const healthCheck = () => {
            fetch('/health').catch(err => console.error("Health check failed:", err));
        };
        // Initial check
        healthCheck();
        // Set interval for every 30 seconds
        const intervalId = setInterval(healthCheck, 30000);
        // Cleanup on component unmount
        return () => clearInterval(intervalId);
    }, []);

    if (!isLoggedIn) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <LoginPanel onLoginSuccess={handleLoginSuccess} />
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'climate':
                return <ClimatePanel currentUser={currentUser} />;
            case 'parking':
                return <ParkingPanel currentUser={currentUser} />;
            case 'meetings':
                return <MeetingRoomsPanel currentUser={currentUser} />;
            case 'automation':
                return <AutomationPanel currentUser={currentUser} />;
            case 'wellness':
                return <WellnessPanel currentUser={currentUser} />;
            case 'users':
                return <UsersPanel currentUser={currentUser} />;
            default:
                return <ClimatePanel currentUser={currentUser} />;
        }
    };

    const NavItem = ({ view, label, icon }) => (
        <button
            onClick={() => setCurrentView(view)}
            className={`flex items-center space-x-2 py-3 px-6 transition-all duration-200 border-b-2 -mb-px ${currentView === view
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-cyan-500/50'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span className="font-semibold text-md">{label}</span>
        </button>
    );

    return (
        <React.Fragment>
            <div className="flex justify-center items-center gap-6 mb-4">
                <img src="/logo.png" alt="Officer Logo" className="h-20 w-20" />
                <h1 className="text-7xl md:text-8xl font-bold text-cyan-400 text-center" style={{ animation: 'text-cyan-glow-pulse 4s infinite ease-in-out' }}>
                    Officer
                </h1>
            </div>
            <div className="w-full max-w-screen-2xl mb-2">
                <div className="grid grid-cols-3 items-center w-full mb-1 text-sm">
                    <div className="justify-self-start text-gray-500">
                        User: <span className="text-fuchsia-400">{currentUser.username} ({currentUser.role})</span>
                    </div>
                    <div className="justify-self-center">
                        <DigitalClock />
                    </div>
                    <div className="justify-self-end">
                        <button onClick={handleLogout} className="text-gray-500 hover:text-cyan-300">Logout</button>
                    </div>
                </div>
                <StatusLine currentUser={currentUser} />
            </div>
            <div className="bg-black bg-opacity-50 backdrop-blur-xl rounded-2xl border border-cyan-500/50 shadow-cyan-glow" style={{ width: '1440px', height: '820px', animation: 'cyan-glow-pulse 4s infinite ease-in-out' }}>
                <nav className="flex justify-center border-b border-cyan-500/30 px-2">
                    <NavItem view="climate" label="Environment" icon="🌡️" />
                    <NavItem view="parking" label="Parking" icon="🅿️" />
                    <NavItem view="meetings" label="Meeting Rooms" icon="🤝" />
                    {/* Show automation tab to all, but functionality is restricted inside */}
                    <NavItem view="wellness" label="Wellness" icon="❤️" />
                    <NavItem view="automation" label="Automation" icon="🤖" />
                    {currentUser.role === 'admin' && <NavItem view="users" label="Users" icon="👥" />}
                </nav>
                {/* Subtract nav height and padding from main content area */}
                <main className="p-6 md:p-8" style={{ height: 'calc(100% - 55px)' }}>
                    {renderView()}
                </main>
            </div>
            <footer className="w-full text-center text-xs text-gray-600 font-mono pt-4">
                Co-Founders Reut, Fuad and Neorevn
            </footer>
        </React.Fragment>
    );
};

export default App;