import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
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

  const logout = async () => {
      await api.post("/auth/logout");
      navigate(`/login`);
  }

  const createRoom = async () => {
    try {
      const res = await api.post("/rooms", {});
      navigate(`/room/${res.data.code}`);
    } catch {
      alert("Ошибка создания комнаты");
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      alert("Введите код комнаты");
      return;
    }
    try {
      await api.post("/rooms/join", { code: joinCode, nickname });
      navigate(`/room/${joinCode}`);
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка присоединения");
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
        <h1 style={{ fontWeight: "700", fontSize: "28px" }}>MEETS</h1>

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
                top: "50px",
                background: "#3c4043",
                borderRadius: "9px",
                overflow: "hidden",
                boxShadow: "0 9px 19px rgba(0,0,0,0.3)",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => {
                  createRoom();
                  setMenuOpen(false);
                }}
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
                Новая комната
              </button>
              <button
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
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
                Профиль
              </button>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
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
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "20px",
          background: "#303134",
          borderRadius: "12px",
        }}
      >
        <h3 style={{ marginBottom: "15px", fontSize: "16px", fontWeight: "500" }}>
          Присоединиться к комнате
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#3c4043",
              color: "#fff",
            }}
            placeholder="Код комнаты (xxx-xxx-xxx)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <input
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#3c4043",
              color: "#fff",
            }}
            placeholder="Ваше имя (опционально)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
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
      </div>

      <div
        style={{
          marginTop: "40px",
          maxWidth: "600px",
          margin: "40px auto 0",
        }}
      >
        <h3 style={{ marginBottom: "15px", fontSize: "18px", fontWeight: "500" }}>
          Мои комнаты
        </h3>
        {rooms.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.6, marginTop: "30px" }}>
            У вас нет созданных комнат
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rooms.map((room) => (
              <li
                key={room.id}
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
                <div
                  style={{ cursor: "pointer", flex: 1 }}
                  onClick={() => navigate(`/room/${room.code}`)}
                >
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Комната {room.code}
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.7 }}>
                    Создана: {new Date(room.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>

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
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRoom(room.id);
                  }}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
