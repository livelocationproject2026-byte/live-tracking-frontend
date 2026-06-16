import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const colors = ["#ff3b30", "#007aff", "#34c759"]; // Fixed array footprint for 3 targets
const BACKEND_URL = "https://live-tracker-backend-nj1r.onrender.com"; 

function App() {
    const [googleLink, setGoogleLink] = useState("");
    const [personName, setPersonName] = useState("");
    const [persons, setPersons] = useState([]);
    const [tracking, setTracking] = useState({});
    const [currentUser, setCurrentUser] = useState({ userid: "Guest", name: "User" });

    // Handles cross-origin URL data fallback parameters and syncs local states
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlUserid = params.get("userid");
        const urlName = params.get("name");

        if (urlUserid && urlName) {
            const URLUserObj = { userid: urlUserid, name: urlName };
            setCurrentUser(URLUserObj);
            localStorage.setItem("user", JSON.stringify(URLUserObj));
            
            // Clean up address bar query parameters smoothly
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        // Standard port-isolated browser lookup sequence fallback
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (err) {
                console.error("Session parse error:", err);
            }
        }
    }, []);

    const extractCoordinates = (link) => {
        try {
            const atMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
            const qMatch = link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (qMatch) return { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) };
            return null;
        } catch (err) {
            return null;
        }
    };

    const trackPerson = async () => {
        // Enforces the 3 person maximum limit threshold restriction
        if (persons.length >= 3) {
            alert("Maximum limit reached! Only a maximum of 3 tracked persons are allowed simultaneously.");
            return;
        }

        if (!googleLink || !personName) {
            alert("Enter Name & Google Link");
            return;
        }

        const trimmedName = personName.trim();
        const duplicate = persons.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
        if (duplicate) {
            alert("Person identifier already active on tracking mesh");
            return;
        }

        const coords = extractCoordinates(googleLink);
        if (!coords) {
            alert("Invalid Google Maps Link Structure!");
            return;
        }

        const assignedColor = colors[persons.length];

        const newPerson = {
            id: Date.now(),
            name: trimmedName,
            latitude: coords.latitude,
            longitude: coords.longitude,
            googleLink,
            color: assignedColor
        };

        setPersons(prev => [...prev, newPerson]);

        try {
            await fetch(`${BACKEND_URL}/save-location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userid: currentUser.userid,
                    personName: trimmedName,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    googleLink
                })
            });
        } catch (err) {
            console.error("Database connection failure:", err);
        }

        setGoogleLink("");
        setPersonName("");
    };

    const startTracking = (person) => {
        if (tracking[person.id]) return;

        let currentLat = person.latitude;
        let currentLng = person.longitude;

        const interval = setInterval(async () => {
            const latDelta = (Math.random() - 0.5) * 0.001;
            const lngDelta = (Math.random() - 0.5) * 0.001;

            currentLat += latDelta;
            currentLng += lngDelta;

            setPersons(prev =>
                prev.map(p => p.id === person.id ? { ...p, latitude: currentLat, longitude: currentLng } : p)
            );

            try {
                await fetch(`${BACKEND_URL}/save-location`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userid: currentUser.userid,
                        personName: person.name,
                        latitude: currentLat,
                        longitude: currentLng,
                        googleLink: person.googleLink
                    })
                });
            } catch (err) {
                console.error("Interval sync failure:", err);
            }
        }, 5000);

        setTracking(prev => ({ ...prev, [person.id]: interval }));
        alert(`${person.name} Live Tracking System Engaged`);
    };

    const stopTracking = (id) => {
        if (!tracking[id]) return;
        clearInterval(tracking[id]);
        setTracking(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
        alert("Tracking Loop Disengaged");
    };

    const removePerson = (id) => {
        if (tracking[id]) clearInterval(tracking[id]);
        setTracking(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
        setPersons(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="app">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 30px", background: "#111", color: "white", borderRadius: "8px", marginBottom: "20px" }}>
                <h1 style={{ fontSize: "24px", margin: 0, color: "white", textAlign: "left" }}>
                    <span style={{ color: "#00aaff" }}>LIVE</span> TRACKING PANEL
                </h1>
                <span style={{ background: "#222", padding: "8px 16px", borderRadius: "6px", fontSize: "14px", border: "1px solid #333" }}>
                    Active Session: <strong style={{ color: "#00aaff" }}>{currentUser.name}</strong>
                </span>
            </div>
            
            <div className="input-box">
                <input type="text" placeholder="Person Name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
                <input type="text" placeholder="Paste Google Maps Link" value={googleLink} onChange={(e) => setGoogleLink(e.target.value)} />
                <button onClick={trackPerson} style={{ background: "#00aaff" }}>Track Target ({persons.length}/3)</button>
            </div>

            <MapContainer center={[22.57, 88.36]} zoom={7} style={{ height: "calc(100vh - 180px)", width: "100%", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {persons.map((person) => {
                    if (person.latitude === undefined || person.longitude === undefined) return null;

                    const dynamicIcon = L.divIcon({
                        className: "custom-marker-wrapper",
                        html: `
                        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-15px, -45px);">
                            <div style="background:white; color:black; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:bold; border:2px solid ${person.color}; box-shadow:0 3px 10px rgba(0,0,0,0.25); margin-bottom:4px; white-space:nowrap;">
                                ${person.name}
                            </div>
                            <svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${person.color}" stroke="white" stroke-width="1.5"/>
                            </svg>
                        </div>
                        `,
                        iconSize: [0, 0] 
                    });

                    return (
                        <Marker key={person.id} position={[person.latitude, person.longitude]} icon={dynamicIcon}>
                            <Popup minWidth={240}>
                                <h3 style={{ margin: "0 0 5px 0", color: person.color }}>{person.name}</h3>
                                <p style={{ margin: "2px 0", color: "#555" }}><b>Latitude:</b> {person.latitude.toFixed(6)}</p>
                                <p style={{ margin: "2px 0", color: "#555" }}><b>Longitude:</b> {person.longitude.toFixed(6)}</p>
                                <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "10px 0" }} />
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <button onClick={() => startTracking(person)} style={{ width: "100%", padding: "6px", background: "#34c759", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>▶ Start Tracking</button>
                                    <button onClick={() => stopTracking(person.id)} style={{ width: "100%", padding: "6px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>⏹ Stop Tracking</button>
                                    <button onClick={() => removePerson(person.id)} style={{ width: "100%", padding: "6px", background: "#ff3b30", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>❌ Remove Asset</button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

export default App;