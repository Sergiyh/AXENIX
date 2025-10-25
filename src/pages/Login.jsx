import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [roomCode, setRoomCode] = useState("");
  const [guestNickname, setGuestNickname] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      alert("Введите код комнаты");
      return;
    }
    if (!guestNickname.trim()) {
      alert("Введите ваше имя");
      return;
    }

    try {
      const res = await api.post("/rooms/join", {
        code: roomCode.trim(),
        nickname: guestNickname.trim(),
      });

      if (res.status === 200) {
        navigate(`/room/${roomCode.trim()}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Ошибка присоединения к комнате");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", {
        nickname: nickname.trim(),
        password: password.trim(),
      });

      if (res.status === 200) navigate("/rooms");
      else alert("Ошибка входа");
    } catch (err) {
      console.error(err);
      alert("Ошибка входа");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #141e30, #243b55)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(10px)",
          padding: "35px",
          borderRadius: "15px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          color: "#fff",
        }}
      >
        {!showLogin ? (
          <>
            <h2
              style={{
                marginBottom: "10px",
                fontWeight: "600",
                fontSize: "26px",
                textAlign: "center",
              }}
            >
              Присоединиться к комнате
            </h2>
            <p
              style={{
                fontSize: "14px",
                opacity: 0.8,
                textAlign: "center",
                marginBottom: "25px",
              }}
            >
              Введите код комнаты
            </p>

            <input
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "none",
                outline: "none",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: "16px",
                textAlign: "center",
                letterSpacing: "2px",
              }}
              placeholder="xxx-xxx-xxx"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />

            <input
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "none",
                outline: "none",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: "15px",
              }}
              placeholder="Ваше имя"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
            />

            <button
              onClick={handleJoinRoom}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#4a90e2",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                transition: "0.3s",
                marginBottom: "20px",
              }}
              onMouseOver={(e) => (e.target.style.background = "#6bb7ff")}
              onMouseOut={(e) => (e.target.style.background = "#4a90e2")}
            >
              Войти в комнату
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
              <span
                style={{
                  padding: "0 15px",
                  fontSize: "13px",
                  opacity: 0.7,
                }}
              >
                или
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
            </div>

            <button
              onClick={() => setShowLogin(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.3)",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                transition: "0.3s",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.08)")
              }
            >
              Войти в аккаунт
            </button>

            <p
              style={{
                marginTop: "15px",
                fontSize: "13px",
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              Нет аккаунта?
              <span
                style={{
                  cursor: "pointer",
                  textDecoration: "underline",
                  marginLeft: "5px",
                }}
                onClick={() => navigate("/register")}
              >
                Регистрация
              </span>
            </p>
          </>
        ) : (
          <>
            <h2
              style={{
                marginBottom: "25px",
                fontWeight: "600",
                fontSize: "24px",
                textAlign: "center",
              }}
            >
              Вход в аккаунт
            </h2>

            <input
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "none",
                outline: "none",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: "15px",
              }}
              placeholder="Никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            <input
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "none",
                outline: "none",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: "15px",
              }}
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#4a90e2",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                transition: "0.3s",
                marginBottom: "15px",
              }}
              onMouseOver={(e) => (e.target.style.background = "#6bb7ff")}
              onMouseOut={(e) => (e.target.style.background = "#4a90e2")}
            >
              Войти
            </button>

            <button
              onClick={() => setShowLogin(false)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.3)",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                transition: "0.3s",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.08)")
              }
            >
              Назад
            </button>

            <p
              style={{
                marginTop: "15px",
                fontSize: "13px",
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              Нет аккаунта?
              <span
                style={{
                  cursor: "pointer",
                  textDecoration: "underline",
                  marginLeft: "5px",
                }}
                onClick={() => navigate("/register")}
              >
                Регистрация
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
