import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function JoinByLink() {
  const [inviteLink, setInviteLink] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  // Проверяем авторизован ли пользователь
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/users/me");
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleJoin = async () => {
    if (!inviteLink.trim()) {
      setError("Введите ссылку на комнату");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = new URL(inviteLink);
      const code = url.pathname.split("/").pop(); // берём код комнаты из ссылки

      const payload = {
        code: code,
        nickname: "fast_login",
      };

      await api.post(`/rooms/join`, payload);
      navigate(`/room/${code}`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError("Комната не найдена. Проверьте ссылку-приглашение.");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "Неверная ссылка на комнату.");
      } else {
        setError("Произошла ошибка при подключении. Попробуйте снова.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div
        style={{
          height: "100vh",
          background: "linear-gradient(160deg, #0f0f0f, #1a0a00)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(160deg, #0f0f0f, #1a0a00)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        fontFamily: "Inter, Arial, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1b1b1b",
          border: "1px solid #ff6f00",
          borderRadius: "14px",
          padding: "30px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 0 20px rgba(255, 111, 0, 0.2)",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "15px" }}>Войти по ссылке</h2>
        <p style={{ opacity: 0.8, marginBottom: "20px" }}>
          Вставьте ссылку-приглашение, чтобы войти в комнату
        </p>

        <input
          type="text"
          value={inviteLink}
          onChange={(e) => setInviteLink(e.target.value)}
          placeholder="https://app.site/room/abc-def-ghi"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#121212",
            color: "#fff",
            fontSize: "14px",
            marginBottom: "15px",
            boxSizing: "border-box",
          }}
        />

        

        {error && (
          <div
            style={{
              background: "#2b0000",
              color: "#ff6f00",
              borderRadius: "8px",
              padding: "8px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            background: loading ? "#ff8f00aa" : "#ff6f00",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "15px",
            transition: "0.2s",
          }}
          onMouseEnter={(e) =>
            !loading && (e.currentTarget.style.background = "#ffa040")
          }
          onMouseLeave={(e) =>
            !loading && (e.currentTarget.style.background = "#ff6f00")
          }
        >
          {loading ? "Подключение..." : "Войти"}
        </button>

        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "15px",
            background: "transparent",
            border: "none",
            color: "#ff8f00",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Назад к входу
        </button>
      </div>
    </div>
  );
}
