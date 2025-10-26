import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "",
    schedule: "",
    banned_words: "",
  });
  const menuRef = useRef(null);
  const modalRef = useRef(null);
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
    if (!roomForm.name.trim()) {
      alert("Введите название комнаты");
      return;
    }

    try {
      const banned_words_array = roomForm.banned_words
        .split(",")
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      const scheduleDate = roomForm.schedule
        ? new Date(roomForm.schedule).toISOString()
        : new Date().toISOString();

      const res = await api.post("/rooms", {
        name: roomForm.name,
        schedule: scheduleDate,
        banned_words: banned_words_array,
      });

      const roomCode = res.data.code;
      await api.post("/rooms/join", { code: roomCode, nickname: "" });
      setCreateModalOpen(false);
      setRoomForm({ name: "", schedule: "", banned_words: "" });
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

  // Закрытие меню при клике вне его
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

  // Закрытие модалки при клике вне её
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setCreateModalOpen(false);
      }
    };

    if (createModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [createModalOpen]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 40%, #ff6b00 120%)",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
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
              setCreateModalOpen(true);
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

      {/* МОДАЛКА СОЗДАНИЯ КОМНАТЫ */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: "#181818",
              padding: "30px",
              borderRadius: "15px",
              width: "90%",
              maxWidth: "500px",
              border: "1px solid #ff7300",
              boxShadow: "0 0 30px rgba(255,115,0,0.4)",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                color: "#ff7300",
                fontSize: "22px",
                fontWeight: "600",
              }}
            >
              Создать комнату
            </h3>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  opacity: 0.9,
                }}
              >
                Название комнаты:
              </label>
              <input
                type="text"
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
                placeholder="Введите название"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ff7300",
                  background: "#0f0f0f",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  opacity: 0.9,
                }}
              >
                Дата и время начала (опционально):
              </label>
              <input
                type="datetime-local"
                value={roomForm.schedule}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, schedule: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ff7300",
                  background: "#0f0f0f",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  opacity: 0.9,
                }}
              >
                Запрещённые слова (через запятую):
              </label>
              <textarea
                value={roomForm.banned_words}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, banned_words: e.target.value })
                }
                placeholder="матерные, запрещённые, слова"
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ff7300",
                  background: "#0f0f0f",
                  color: "#fff",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={createRoom}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#ff7300",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(255,115,0,0.5)",
                  transition: "0.2s",
                }}
              >
                Создать
              </button>

              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setRoomForm({ name: "", schedule: "", banned_words: "" });
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#2c2c2c",
                  border: "1px solid #ff7300",
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                Отмена
              </button>
            </div>
          </div>
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

      <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: "#ff7300",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(255,115,0,0.4)",
                transition: "0.2s",
                width: "400px",
              }}
            >
                + Добавить комнату
              </button>
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
        </div>

        {/* КНОПКА ДОБАВИТЬ КОМНАТУ ПО ЦЕНТРУ */}
        {rooms.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <p style={{ opacity: 0.6, marginBottom: "20px" }}>
              У вас нет созданных комнат
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: "#ff7300",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "14px 24px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255,115,0,0.5)",
                transition: "0.2s",
              }}
            >
              + Создать комнату
            </button>
          </div>
        ) : (
          <>
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
                      {room.name || `Комната ${room.code}`}
                    </div>
                    <div style={{ fontSize: "13px", opacity: 0.8 }}>
                      Код: {room.code}
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

          
          </>
        )}
      </div>
    </div>
  );
}
