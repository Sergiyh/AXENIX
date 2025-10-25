import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
const [nickname, setNickname] = useState("");
const [password, setPassword] = useState("");
const navigate = useNavigate();

const handleLogin = async () => {
    try {
    const res = await api.post("/auth/login", {
        nickname: nickname.trim(),
        password: password.trim(),
    });

    if (res.status === 200 || res.status === 401 || res.status === 500) navigate("/rooms");
    else alert("Ошибка входа");
    } catch (err) {
    console.error(err);
    alert("Ошибка входа");
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
        Вход
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
        onClick={handleLogin}
        style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#b50000ff",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "600",
            transition: "0.3s"
        }}
        onMouseOver={(e) => (e.target.style.background = "#6bb7ff")}
        onMouseOut={(e) => (e.target.style.background = "#4a90e2")}
        >
        Войти
        </button>

        <p style={{ marginTop: "15px", fontSize: "14px", opacity: 0.8 }}>
        Нет аккаунта?
        <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/register")}
        >
            {" "}Регистрация
        </span>
        </p>
    </div>
    </div>
);
}
