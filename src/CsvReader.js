import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

const CsvReader = () => {
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [expandedPin, setExpandedPin] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedDates, setSelectedDates] = useState({}); // { pin: selectedDate }

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

        const fileNames = Array.from({ length: 10 }, (_, i) => `/transaction_C20${i}.csv`);
        Promise.all(
            fileNames.map((file) =>
                fetch(file)
                    .then((res) => res.text())
                    .then((text) =>
                        Papa.parse(text, {
                            header: true,
                            skipEmptyLines: true,
                        }).data
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

    return (
        <div className="container mt-5">
            <h2 className="mb-4 text-center">📅 Grouped Access Logs by Day</h2>

            <input
                type="text"
                className="form-control mb-3"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <table className="table table-hover table-bordered">
                <thead className="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Color</th>
                        <th>CardNo</th>
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
                            return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1); // most recent first
                        });
                        const selectedDate = selectedDates[user.Pin] || availableDates[0];

                        return (
                            <React.Fragment key={index}>
                                <tr
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => toggleExpand(user.Pin)}
                                    className={isExpanded ? 'table-success' : ''}
                                >
                                    <td>{user.Name}</td>
                                    <td>
                                        <span
                                            className={`badge bg-${user.Color.toLowerCase() === 'green' ? 'success' : 'primary'}`}
                                        >
                                            {user.Color}
                                        </span>
                                    </td>
                                    <td>{user.CardNo}</td>
                                </tr>

                                {isExpanded && (
                                    <tr>
                                        <td colSpan="3">
                                            <div className="mb-2">
                                                <strong>Available Days:</strong>{' '}
                                                <select
                                                    value={selectedDate}
                                                    onChange={(e) => handleDateChange(user.Pin, e.target.value)}
                                                    className="form-select form-select-sm w-auto d-inline-block"
                                                >
                                                    {availableDates.map((d, i) => (
                                                        <option key={i} value={d}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {grouped[selectedDate] ? (
                                                <table className="table table-sm table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th>Verified</th>
                                                            <th>DoorID</th>
                                                            <th>Timestamp</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {grouped[selectedDate]
                                                            .sort((a, b) => b.Time_second - a.Time_second)
                                                            .map((t, i) => (
                                                                <tr key={i}>
                                                                    <td>
                                                                        {['4', '0', '6'].includes(t.Verified)
                                                                            ? '✅ Success'
                                                                            : t.Verified === 'x'
                                                                                ? '❌ Access Denied'
                                                                                : t.Verified}
                                                                    </td>
                                                                    <td>{t.DoorID}</td>
                                                                    <td>{convertTime(t.Time_second).full}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p>No transactions found for this day.</p>
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
    );
};

export default CsvReader;
