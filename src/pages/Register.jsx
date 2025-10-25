import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [nickname, setNickname] = useState("");const [password, setPassword] = useState("");const navigate = useNavigate();
const handleRegister = async () => {
    try {
await api.post("/auth/register", {
        nickname: nickname.trim(),
        password: password.trim(),
});

    alert("Регистрация успешна!");
navigate("/login");
    } catch {
alert("Ошибка регистрации");
    }
};

return (
    <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #141e30, #243b55)",
    fontFamily: "Arial, sans-serif"
    }}>
    <div style={{
        width: "350px",
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(10px)",
        padding: "35px",
        borderRadius: "15px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        color: "#fff",
        textAlign: "center"
    }}>
        <h2 style={{ marginBottom: "25px", fontWeight: "600", fontSize: "24px" }}>
        Создать аккаунт
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
            fontSize: "15px"
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
            fontSize: "15px"
        }}
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />

        <button
        onClick={handleRegister}
        style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#8ee24aff",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "600",
            transition: "0.3s"
        }}
        onMouseOver={(e) => (e.target.style.background = "#6bb7ff")}
        onMouseOut={(e) => (e.target.style.background = "#4a90e2")}
        >
        Зарегистрироваться
        </button>

        <p style={{ marginTop: "15px", fontSize: "14px", opacity: 0.8 }}>
        Уже есть аккаунт?{" "}
        <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/login")}
        >
            Войти
        </span>
        </p>
    </div>
    </div>
);
}
