import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const [searchParams] = useSearchParams();
  const roomCodeFromUrl = searchParams.get("room");

  const [roomCode, setRoomCode] = useState(roomCodeFromUrl || "");
  const [guestNickname, setGuestNickname] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/users/me");
        if (res.status === 200) {
          if (roomCodeFromUrl) {
            await joinRoomAuthorized(roomCodeFromUrl);
          } else {
            navigate("/rooms");
          }
        }
      } catch {}
      finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate, roomCodeFromUrl]);

  const joinRoomAuthorized = async (code) => {
    try {
      await api.post("/rooms/join", { code: code.trim(), nickname: null });
      navigate(`/room/${code.trim()}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Ошибка присоединения к комнате");
      setIsChecking(false);
    }
  };

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
      alert(err.response?.data?.detail || "Ошибка присоединения к комнате");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", {
        nickname: nickname.trim(),
        password: password.trim(),
      });
      if (res.status === 200) {
        if (roomCodeFromUrl) {
          await joinRoomAuthorized(roomCodeFromUrl);
        } else {
          navigate("/rooms");
        }
      } else {
        alert("Ошибка входа");
      }
    } catch {
      alert("Ошибка входа");
    }
  };

  if (isChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
          fontFamily: "'Inter', sans-serif",
          color: "#fff",
          fontSize: "18px",
        }}
      >
        Загрузка...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 40%, #ff6b00 120%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#181818",
          padding: "35px",
          borderRadius: "15px",
          boxShadow: "0 0 15px rgba(255,115,0,0.2)",
          border: "1px solid #2b2b2b",
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
                color: "#ff7300",
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
                width: "90%",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "1px solid #ff7300",
                outline: "none",
                background: "#0f0f0f",
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
                width: "90%",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #ff7300",
                outline: "none",
                background: "#0f0f0f",
                color: "#fff",
                fontSize: "15px",
              }}
              placeholder="Ваше имя"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
            />

            <button
              onClick={handleJoinRoom}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#ff7300",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 0 10px rgba(255,115,0,0.5)",
                marginBottom: "20px",
              }}
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
              <div style={{ flex: 1, height: "1px", background: "#2b2b2b" }} />
              <span
                style={{
                  padding: "0 15px",
                  fontSize: "13px",
                  opacity: 0.7,
                }}
              >
                или
              </span>
              <div style={{ flex: 1, height: "1px", background: "#2b2b2b" }} />
            </div>

            <button
              onClick={() => setShowLogin(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ff7300",
                cursor: "pointer",
                background: "#1a1a1a",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                marginBottom: "15px",
              }}
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
                color: "#ff7300",
              }}
            >
              Вход в аккаунт
            </h2>

            <input
              style={{
                width: "90%",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "1px solid #ff7300",
                outline: "none",
                background: "#0f0f0f",
                color: "#fff",
                fontSize: "15px",
              }}
              placeholder="Никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            <input
              style={{
                width: "90%",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #ff7300",
                outline: "none",
                background: "#0f0f0f",
                color: "#fff",
                fontSize: "15px",
              }}
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />

            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#ff7300",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 0 10px rgba(255,115,0,0.5)",
                marginBottom: "15px",
              }}
            >
              Войти
            </button>

            <button
              onClick={() => setShowLogin(false)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ff7300",
                cursor: "pointer",
                background: "#1a1a1a",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                marginBottom: "15px",
              }}
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
