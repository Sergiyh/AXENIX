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
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      alert("Введите код комнаты");
      return;
    }
    try {
      const data = await api.post("/rooms/join", { code: joinCode, nickname });
      navigate(`/room/${joinCode}`);
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка присоединения");
    }
  };

  const joinExistingRoom = async (roomCode) => {
    try {
      await api.post("/rooms/join", { code: roomCode, nickname: "" });
      navigate(`/room/${roomCode}`);
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка присоединения");
    }
  };

  const createRoom = async () => {
    try {
      const res = await api.post("/rooms", {});
      const roomCode = res.data.code;
      const data = await api.post("/rooms/join", { code: roomCode, nickname: "" });
      navigate(`/room/${roomCode}`);
    } catch (e) {
      console.error(e);
      alert("Ошибка создания комнаты");
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
      {/* Header с бургер-меню слева и заголовком по центру */}
      <div
        style={{
          position: "relative",
          marginBottom: "90px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Бургер-меню слева */}
        <div style={{ position: "absolute", left: 0 }}>
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
            <span
              style={{
                width: "26px",
                height: "4px",
                background: "#fff",
                borderRadius: "2px",
              }}
            ></span>
            <span
              style={{
                width: "26px",
                height: "4px",
                background: "#fff",
                borderRadius: "2px",
              }}
            ></span>
            <span
              style={{
                width: "26px",
                height: "4px",
                background: "#fff",
                borderRadius: "2px",
              }}
            ></span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50px",
                background: "#3c4043",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 9px 19px rgba(0,0,0,0.3)",
                zIndex: 10,
                width: "180px",
              }}
            >
              <button
                onClick={() => {
                  createRoom();
                  setMenuOpen(false);
                }}
                style={{
                  padding: "16px 20px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#555")}
                onMouseLeave={(e) => (e.target.style.background = "none")}
              >
                📹 Новая комната
              </button>
              <button
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                style={{
                  padding: "16px 20px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#555")}
                onMouseLeave={(e) => (e.target.style.background = "none")}
              >
                👤 Профиль
              </button>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                style={{
                  padding: "16px 20px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#555")}
                onMouseLeave={(e) => (e.target.style.background = "none")}
              >
                🚪 Выйти
              </button>
            </div>
          )}
        </div>

        {/* Заголовок по центру */}
        <h1
          style={{
            fontWeight: "700",
            fontSize: "28px",
            margin: 0,
            textAlign: "center",
          }}
        >
          AXENIX MEET
        </h1>
      </div>

      {/* Присоединиться к комнате */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "25px",
          background: "#303134",
          borderRadius: "19px",
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
              outline: "none",
            }}
            placeholder="Код комнаты (xxx-xxx-xxx)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                joinRoom();
              }
            }}
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
              transition: "background 0.2s",
            }}
            onClick={joinRoom}
            onMouseEnter={(e) => (e.target.style.background = "#1557b0")}
            onMouseLeave={(e) => (e.target.style.background = "#1a73e8")}
          >
            Войти
          </button>
        </div>
      </div>

      {/* Мои комнаты */}
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Комната {room.code}
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.7 }}>
                    Создана: {new Date(room.created_at).toLocaleString("ru-RU")}
                  </div>
                  {!room.is_active && (
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#d93025",
                        marginTop: "4px",
                      }}
                    >
                      Комната закрыта
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {room.is_active && (
                    <button
                      style={{
                        padding: "6px 10px",
                        background: "#1a73e8",
                        borderRadius: "6px",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "background 0.2s",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        joinExistingRoom(room.code);
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#1557b0")}
                      onMouseLeave={(e) => (e.target.style.background = "#1a73e8")}
                    >
                      Присоединиться
                    </button>
                  )}

                  <button
                    style={{
                      padding: "6px 10px",
                      background: "#d93025",
                      borderRadius: "6px",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      transition: "background 0.2s",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Вы уверены, что хотите удалить комнату?")) {
                        deleteRoom(room.id);
                      }
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#b52818")}
                    onMouseLeave={(e) => (e.target.style.background = "#d93025")}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
