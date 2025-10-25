import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!nickname.trim() || !password.trim()) {
      alert("Введите никнейм и пароль");
      return;
    }

    try {
      await api.post("/auth/register", {
        nickname: nickname.trim(),
        password: password.trim(),
      });

      alert("Регистрация успешна!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка регистрации");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background:
          "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 40%, #ff6b00 120%)",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#181818",
          padding: "35px",
          borderRadius: "15px",
          boxShadow: "0 0 20px rgba(255,115,0,0.2)",
          border: "1px solid #2b2b2b",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            marginBottom: "25px",
            fontWeight: "600",
            fontSize: "26px",
            color: "#ff7300",
            textShadow: "0 0 10px rgba(255,115,0,0.6)",
          }}
        >
          Создать аккаунт
        </h2>

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
            fontSize: "15px",
          }}
          placeholder="Никнейм"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleRegister()}
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
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleRegister()}
        />

        <button
          onClick={handleRegister}
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
            marginBottom: "15px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#ff8c1a")}
          onMouseOut={(e) => (e.target.style.background = "#ff7300")}
        >
          Зарегистрироваться
        </button>

        <p
          style={{
            marginTop: "10px",
            fontSize: "14px",
            opacity: 0.8,
            textAlign: "center",
          }}
        >
          Уже есть аккаунт?
          <span
            style={{
              cursor: "pointer",
              textDecoration: "underline",
              marginLeft: "5px",
              color: "#ff7300",
            }}
            onClick={() => navigate("/login")}
          >
            Войти
          </span>
        </p>
      </div>
    </div>
  );
}
