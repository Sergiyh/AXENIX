import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch {
      alert("Ошибка загрузки комнат");
    }
  };

  const joinRoom = async () => {
    try {
      await api.post("/rooms/join", { room_id: joinRoomId });
      setJoinRoomId("");
      fetchRooms();
    } catch {
      alert("Ошибка присоединения");
    }
  };

  const deleteRoom = async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      fetchRooms();
    } catch {
      alert("Ошибка удаления");
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        background: "#202124",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "90px",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontWeight: "700", fontSize: "28px" }}>SERGEY LOX</h1>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "60px",
              height: "40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              alignItems: "center",
              background: "#3c4043",
              border: "none",
              borderRadius: "11px",
              cursor: "pointer",
              padding: "7px",
            }}
          >
            <span style={{ width: "26px", height: "4px", background: "#fff", borderRadius: "2px" }}></span>
            <span style={{ width: "26px", height: "4px", background: "#fff", borderRadius: "2px" }}></span>
            <span style={{ width: "26px", height: "4px", background: "#fff", borderRadius: "2px" }}></span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "40px",
                background: "#3c4043",
                borderRadius: "9px",
                overflow: "hidden",
                boxShadow: "0 9px 19px rgba(0,0,0,0.3)",
              }}
            >
              <button
                style={{
                  padding: "16px 30px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Новая встреча
              </button>
              <button
                onClick={() => navigate("/profile")}
                style={{
                  padding: "10px 20px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Профиль
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "20px",
          background: "#303134",
          borderRadius: "12px",
          display: "flex",
          gap: "12px",
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #555",
            background: "#3c4043",
            color: "#fff",
          }}
          placeholder="Введите ID комнаты"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
        />
        <button
          style={{
            padding: "12px 15px",
            borderRadius: "8px",
            border: "none",
            background: "#1a73e8",
            color: "white",
            cursor: "pointer",
            fontWeight: "600",
          }}
          onClick={joinRoom}
        >
          Войти
        </button>
      </div>

      <div
        style={{
          marginTop: "40px",
          maxWidth: "600px",
          margin: "40px auto 0",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((room) => (
            <li
              key={room.room_id}
              style={{
                background: "#3c4043",
                padding: "14px",
                marginBottom: "10px",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {room.name || "Без имени"}
                <span style={{ opacity: 0.7 }}> (ID: {room.room_id})</span>
              </span>

              <button
                style={{
                  padding: "6px 10px",
                  background: "#d93025",
                  borderRadius: "6px",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
                onClick={() => deleteRoom(room.room_id)}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
