import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
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
      await api.post("/rooms/join", { code: joinCode, nickname });
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
      const res = await api.post("/rooms", {name: "string", schedule: "2025-10-25T21:35:32.160Z",banned_words:[
    "string"
  ]});
      const roomCode = res.data.code;
      await api.post("/rooms/join", { code: roomCode, nickname: "" });
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

  // 🔹 Обработчик кликов вне меню
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 40%, #ff6b00 120%)",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "relative",
          marginBottom: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Бургер */}
        <div style={{ position: "absolute", left: 0 }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "50px",
              height: "40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              alignItems: "center",
              background: "#1a1a1a",
              border: "1px solid #ff7300",
              borderRadius: "10px",
              cursor: "pointer",
              padding: "5px",
              boxShadow: "0 0 10px rgba(255,115,0,0.3)",
              transition: "0.2s",
            }}
          >
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  width: "24px",
                  height: "3px",
                  background: "#ff7300",
                  borderRadius: "2px",
                  transition: "0.2s",
                }}
              ></span>
            ))}
          </button>
        </div>

        <h1
          style={{
            fontWeight: "700",
            fontSize: "30px",
            color: "#ff7300",
            textShadow: "0 0 10px rgba(255,115,0,0.6)",
          }}
        >
          AXENIX MEET
        </h1>
      </div>

      {/* МЕНЮ */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "230px",
            height: "100vh",
            background: "#141414",
            borderRight: "2px solid #ff7300",
            boxShadow: "4px 0 20px rgba(255,115,0,0.3)",
            padding: "20px",
            zIndex: 20,
          }}
        >
          <h3
            style={{
              marginBottom: "30px",
              color: "#ff7300",
              textShadow: "0 0 10px rgba(255,115,0,0.6)",
            }}
          >
            Меню
          </h3>

          <button
            onClick={() => {
              createRoom();
              setMenuOpen(false);
            }}
            style={{
              padding: "14px 10px",
              width: "100%",
              background: "#ff7300",
              border: "none",
              color: "#fff",
              borderRadius: "8px",
              marginBottom: "10px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "0.2s",
              boxShadow: "0 0 15px rgba(255,115,0,0.5)",
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
              padding: "14px 10px",
              width: "100%",
              background: "#2c2c2c",
              border: "1px solid #ff7300",
              color: "#fff",
              borderRadius: "8px",
              marginBottom: "10px",
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
              padding: "14px 10px",
              width: "100%",
              background: "#d93025",
              border: "none",
              color: "#fff",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Выйти
          </button>
        </div>
      )}

      {/* ПОДКЛЮЧЕНИЕ */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "25px",
          background: "#181818",
          borderRadius: "15px",
          boxShadow: "0 0 15px rgba(255,115,0,0.2)",
          border: "1px solid #2b2b2b",
        }}
      >
        <h3 style={{ marginBottom: "15px", fontSize: "18px", fontWeight: "600", color: "#ff7300" }}>
          Присоединиться к комнате
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ff7300",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
            }}
            placeholder="Код комнаты (xxx-xxx-xxx)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />

          <button
            style={{
              padding: "12px 15px",
              borderRadius: "8px",
              border: "none",
              background: "#ff7300",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
              boxShadow: "0 0 10px rgba(255,115,0,0.5)",
            }}
            onClick={joinRoom}
          >
            Войти
          </button>
        </div>
      </div>

      {/* МОИ КОМНАТЫ */}
      <div style={{ marginTop: "40px", maxWidth: "600px", margin: "40px auto 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#ff7300" }}>Мои комнаты</h3>
          <button
            onClick={createRoom}
            style={{
              background: "#ff7300",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255,115,0,0.4)",
              transition: "0.2s",
            }}
          >
            + Добавить комнату
          </button>
        </div>

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
                  background: "#1a1a1a",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #2c2c2c",
                  boxShadow: "0 0 8px rgba(255,115,0,0.15)",
                  transition: "transform 0.2s ease",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", color: "#ff7300", marginBottom: "4px" }}>
                    Комната {room.code}
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.8 }}>
                    Создана: {new Date(room.created_at).toLocaleString("ru-RU")}
                  </div>
                  {!room.is_active && (
                    <div style={{ fontSize: "13px", color: "#ff4d3b", marginTop: "4px" }}>
                      Комната закрыта
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {room.is_active && (
                    <button
                      style={{
                        padding: "6px 10px",
                        background: "#ff7300",
                        borderRadius: "6px",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        joinExistingRoom(room.code);
                      }}
                    >
                      Присоединиться
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
