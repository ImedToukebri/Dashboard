import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

// Helper to get initials for avatar
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase();

const controllerMap = Array.from({ length: 10 }, (_, i) => ({
    file: `/transaction_C20${i}.csv`,
    controller: i + 1
}));

// Room names by controller-door key (e.g., "200-1")
const roomNames = {
    '200-1': 'Main Entrance',
    '200-2': 'Main Exit',
    '201-1': 'Main Hall Entrance',
    '201-2': 'Main Hall Exit',
    '201-3': 'Tech Room',
    '201-4': 'Hall Entrance',
    '202-1': 'Game On',
    '202-2': 'Console Room Entry',
    '202-3': 'Console Room Entry',
    '202-4': 'Axe Throwing Entry',
    '204-1': 'Computer Game Control',
    '204-2': 'Arcade Room',
    '204-3': 'Escape Room 1 Exit',
    '204-4': 'Escape Room 2 Exit',
    '205-1': 'Escape Room 3 Entrance',
    '205-2': 'Escape Room 3 Exit',
    '205-3': 'Axe Throwing Entrance',
    '205-4': 'Axe Throwing Exit',
    '206-1': "Manager's Office",
    '206-2': 'Escape Room 1 Entrance',
    '206-3': 'Floor is Lava Entry',
    '206-4': 'Digital Games Entrance',
    '207-1': 'Back Door Entrance',
    '207-2': 'Game Hall Entrance',
    '207-3': 'Escape Room 2 Entrance',
    '207-4': 'Meeting Room',
    '208-1': 'Escape Room 5 Entrance',
    '208-2': 'Escape Room 4 Entrance',
    '209-2': 'Storage Room',
    '209-3': 'Kitchen'
};

const CsvReader = () => {
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [expandedPin, setExpandedPin] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedDates, setSelectedDates] = useState({});
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetch('/users.csv')
            .then((res) => res.text())
            .then((text) => {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => setUsers(results.data),
                });
            });

        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        const allData = await Promise.all(
            controllerMap.map(({ file, controller }) =>
                fetch(file)
                    .then((res) => res.text())
                    .then((text) =>
                        Papa.parse(text, {
                            header: true,
                            skipEmptyLines: true,
                        }).data.map(t => ({ ...t, controllerNumber: controller }))
                    )
            )
        );
        const merged = [].concat(...allData);
        setTransactions(merged);
    };

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        try {
            const res = await fetch('http://localhost:4000/sync-transactions');
            const data = await res.json();

            if (res.ok && data.success) {
                alert('✅ Transactions synced successfully. Reloading data...');
                await fetchTransactions();
            } else {
                alert(`❌ Sync failed: ${data.message || 'Unknown error'}`);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleExpand = (pin) => {
        setExpandedPin(prev => (prev === pin ? null : pin));
    };

    const convertTime = (t) => {
        const time = parseInt(t, 10);
        const Second = time % 60;
        const Minute = Math.floor(time / 60) % 60;
        const Hour = Math.floor(time / 3600) % 24;
        const Day = Math.floor(time / 86400) % 31 + 1;
        const Month = Math.floor(time / (86400 * 31)) % 12 + 1;
        const Year = Math.floor(time / (86400 * 31 * 12)) + 2000;

        return {
            full: `${String(Hour).padStart(2, '0')}:${String(Minute).padStart(2, '0')}:${String(Second).padStart(2, '0')}`,
            date: `${String(Day).padStart(2, '0')}-${String(Month).padStart(2, '0')}-${Year}`,
        };
    };

    const groupByDate = (records) => {
        const groups = {};
        records.forEach((rec) => {
            const { date } = convertTime(rec.Time_second);
            if (!groups[date]) groups[date] = [];
            groups[date].push(rec);
        });
        return groups;
    };

    const filteredUsers = users.filter((user) =>
        user.Name.toLowerCase().includes(search.toLowerCase())
    );

    const handleDateChange = (pin, date) => {
        setSelectedDates(prev => ({ ...prev, [pin]: date }));
    };

    const getFirstCheckInToday = (userTransactions) => {
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        const SIX_AM = 6 * 60 * 60;

        const todaysTx = userTransactions.filter(t => {
            const tx = convertTime(t.Time_second);
            const timeInSeconds = parseInt(t.Time_second, 10) % 86400;
            return tx.date === todayStr && timeInSeconds >= SIX_AM;
        });

        if (!todaysTx.length) return null;
        return todaysTx.sort((a, b) => a.Time_second - b.Time_second)[0];
    };

    return (
        <div className="card-container" style={{ boxShadow: '0 8px 32px 0 #4f8cff11, 0 1.5px 8px 0 #b6c6e322' }}>
            <h2 className="mb-2 text-center">Attendance</h2>
            <div className="text-center mb-4" style={{ color: '#7b8ca7', fontWeight: 500, fontSize: 18 }}>
                Follow attendance
            </div>

            <div className="text-center mb-4">
                <button
                    onClick={handleSync}
                    className="btn btn-outline-primary shadow-sm"
                    disabled={isSyncing}
                    style={{
                        borderRadius: '1rem',
                        fontWeight: '600',
                        padding: '0.5rem 1.5rem',
                        fontSize: '1rem',
                        border: '1.5px solid #4f8cff',
                        color: isSyncing ? '#ccc' : '#4f8cff',
                        backgroundColor: isSyncing ? '#f4f6fb' : 'white',
                        transition: '0.3s ease',
                        cursor: isSyncing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSyncing ? '🔄 Syncing...' : '🔄 Sync Transactions'}
                </button>
            </div>

            <input
                type="text"
                className="form-control mb-3 shadow-sm"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                    maxWidth: 400,
                    margin: '0 auto',
                    display: 'block',
                    background: '#f7fafd',
                    color: '#222',
                    border: '1.5px solid #4f8cff'
                }}
            />

            <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle mb-0">
                    <thead className="table-dark">
                        <tr>
                            <th style={{ width: 60 }}></th>
                            <th style={{ width: 220 }}>Name</th>
                            <th style={{ width: 180 }}>Card Number</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => {
                            const isExpanded = expandedPin === user.Pin;
                            const userTransactions = transactions.filter(
                                (t) => t.Pin && t.Pin.toString() === user.Pin
                            );
                            const grouped = groupByDate(userTransactions);
                            const availableDates = Object.keys(grouped).sort((a, b) => {
                                const [d1, m1, y1] = a.split('-').map(Number);
                                const [d2, m2, y2] = b.split('-').map(Number);
                                return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
                            });
                            const selectedDate = selectedDates[user.Pin] || availableDates[0];
                            const latestCheckIn = getFirstCheckInToday(userTransactions);
                            const checkedIn = !!latestCheckIn;

                            return (
                                <React.Fragment key={index}>
                                    <tr
                                        style={{ cursor: 'pointer', transition: 'background 0.2s', borderTop: index !== 0 ? '2px solid #f4f6fb' : undefined }}
                                        onClick={() => toggleExpand(user.Pin)}
                                        className={isExpanded ? 'table-success shadow-sm' : ''}
                                    >
                                        <td>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%', background: '#e3e8f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: 18, color: '#4f8cff', margin: '0 auto'
                                            }}>{getInitials(user.Name)}</div>
                                        </td>
                                        <td className="fw-semibold" style={{ fontSize: 17 }}>
                                            {user.Name}
                                            {checkedIn && latestCheckIn && (
                                                <div style={{ fontSize: 13, color: '#4f8cff', fontWeight: 500 }}>
                                                    Check-in Date: {convertTime(latestCheckIn.Time_second).date}, {convertTime(latestCheckIn.Time_second).full}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{user.CardNo}</td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="3" className="bg-light">
                                                {grouped[selectedDate] && grouped[selectedDate].length > 0 && (
                                                    <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
                                                        <strong style={{ color: '#4f8cff' }}>Available Days:</strong>{' '}
                                                        <select
                                                            value={selectedDate}
                                                            onChange={(e) => handleDateChange(user.Pin, e.target.value)}
                                                            className="form-select form-select-sm w-auto d-inline-block shadow-sm"
                                                            style={{ background: '#f7fafd', color: '#222', border: '1.5px solid #4f8cff' }}
                                                        >
                                                            {availableDates.map((d, i) => (
                                                                <option key={i} value={d}>
                                                                    {d}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {grouped[selectedDate] && grouped[selectedDate].length > 0 ? (
                                                    <div className="table-responsive">
                                                        <table className="table table-sm table-striped mb-0">
                                                            <thead>
                                                                <tr>
                                                                    <th>Status</th>
                                                                    <th>Room</th>
                                                                    <th>Timestamp</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {grouped[selectedDate]
                                                                    .sort((a, b) => b.Time_second - a.Time_second)
                                                                    .map((t, i) => {
                                                                        const controllerId = 200 + t.controllerNumber - 1;
                                                                        const key = `${controllerId}-${t.DoorID}`;
                                                                        const room = roomNames[key] || `Door ${t.DoorID} (Controller ${t.controllerNumber})`;

                                                                        return (
                                                                            <tr key={i}>
                                                                                <td style={{
                                                                                    fontWeight: 700,
                                                                                    color: ['4', '0', '6'].includes(t.Verified) ? '#4f8cff' :
                                                                                        t.Verified === 'x' ? '#7b8ca7' : '#222'
                                                                                }}>
                                                                                    {['4', '0', '6'].includes(t.Verified)
                                                                                        ? <span title="Success" style={{ fontSize: 18 }}>✔️ Success</span>
                                                                                        : t.Verified === 'x'
                                                                                            ? <span title="Denied" style={{ fontSize: 18 }}>⨉ Denied</span>
                                                                                            : t.Verified}
                                                                                </td>
                                                                                <td>{room}</td>
                                                                                <td>{convertTime(t.Time_second).full}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted">No transactions found for this day.</p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CsvReader;
