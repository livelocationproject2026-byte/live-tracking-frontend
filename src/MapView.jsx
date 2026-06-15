import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import socket from "./socket";

const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
});

export default function MapView() {
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [link, setLink] = useState("");

  useEffect(() => {
    socket.on("receive-location", (data) => {
      const { lat, lng } = data;
      setPosition([lat, lng]);
      setPath((prev) => [...prev, [lat, lng]]);
    });
  }, []);

  const sendGoogleLink = () => {
    if (!link.trim()) return alert("Please paste a Google Maps link.");
    socket.emit("send-google-link", { link });
  };

  return (
    <div>
      <div style={{ padding: "10px", background: "#eee" }}>
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste Google Live Location Link"
          style={{ width: "60%", padding: "8px" }}
        />
        <button
          onClick={sendGoogleLink}
          style={{ marginLeft: "10px", padding: "8px 15px" }}
        >
          Track
        </button>
      </div>

      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "90vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {position && (
          <Marker position={position} icon={markerIcon}>
            <Popup>Simulated Live Location</Popup>
          </Marker>
        )}

        {path.length > 1 && <Polyline positions={path} />}
      </MapContainer>
    </div>
  );
}