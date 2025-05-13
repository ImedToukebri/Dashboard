import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

// Helper to get initials for avatar
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase();

const controllerMap = Array.from({ length: 10 }, (_, i) => ({
    file: `/transaction_C20${i}.csv`,
    controller: i + 1
}));

const CsvReader = () => {
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [expandedPin, setExpandedPin] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedDates, setSelectedDates] = useState({});

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

        Promise.all(
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
        ).then((allData) => {
            const merged = [].concat(...allData);
            setTransactions(merged);
        });
    }, []);

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

    const handleSync = async () => {
        try {
            const res = await fetch('http://localhost:4000/sync-transactions');
            const message = await res.text();
            alert(message);
        } catch (err) {
            alert('❌ Failed to sync transactions.');
            console.error(err);
        }
    };


    const getFirstCheckInToday = (userTransactions) => {
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        const todaysTx = userTransactions.filter(t => convertTime(t.Time_second).date === todayStr);
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
                    style={{
                        borderRadius: '1rem',
                        fontWeight: '600',
                        padding: '0.5rem 1.5rem',
                        fontSize: '1rem',
                        border: '1.5px solid #4f8cff',
                        color: '#4f8cff',
                        backgroundColor: 'white',
                        transition: '0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#4f8cff';
                        e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.color = '#4f8cff';
                    }}
                >
                    🔄 Sync Transactions
                </button>
            </div>

            <input
                type="text"
                className="form-control mb-3 shadow-sm"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 400, margin: '0 auto', display: 'block', background: '#f7fafd', color: '#222', border: '1.5px solid #4f8cff' }}
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
                                                width: 40, height: 40, borderRadius: '50%', background: '#e3e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#4f8cff', margin: '0 auto'
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
                                                                    <th>Door & Controller</th>
                                                                    <th>Timestamp</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {grouped[selectedDate]
                                                                    .sort((a, b) => b.Time_second - a.Time_second)
                                                                    .map((t, i) => (
                                                                        <tr key={i}>
                                                                            <td style={{ fontWeight: 700, color: ['4', '0', '6'].includes(t.Verified) ? '#4f8cff' : t.Verified === 'x' ? '#7b8ca7' : '#222' }}>
                                                                                {['4', '0', '6'].includes(t.Verified)
                                                                                    ? <span title="Success" style={{ fontSize: 18 }}>✔️ Success</span>
                                                                                    : t.Verified === 'x'
                                                                                        ? <span title="Denied" style={{ fontSize: 18 }}>⨉ Denied</span>
                                                                                        : t.Verified}
                                                                            </td>
                                                                            <td>
                                                                                Door {t.DoorID} <span style={{ color: '#7b8ca7', fontWeight: 500 }}>(Controller {t.controllerNumber})</span>
                                                                            </td>
                                                                            <td>{convertTime(t.Time_second).full}</td>
                                                                        </tr>
                                                                    ))}
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
