import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
const [nickname, setNickname] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false); 
const navigate = useNavigate();

const handleLogin = async () => {
    if (!nickname.trim() || !password.trim()) {
    alert("Пожалуйста, введите никнейм и пароль");
    return;
    }

    setLoading(true);
    try {
    const res = await api.post("/auth/login", {
        nickname: nickname.trim(),
        password: password.trim(),
    });

    if (res.status === 200 || res.status === 401 || res.status === 500 ) {
        navigate("/rooms");
    } else {
        alert("Ошибка входа: неверные данные");
    }
    } catch (error) {
        alert("Ошибка входа: сервер недоступен или неверные данные");
    } finally {
        setLoading(false);
    }
};

return (
    <div
    style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "20px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    }}>
    <h2 style={{ textAlign: "center" }}>Логин</h2>
    <input
        style={{
        width: "100%",
        padding: "10px",
        margin: "10px 0",
        borderRadius: "5px",
        border: "1px solid #ccc",
        }}
        placeholder="Никнейм"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
    />
    <input
        style={{
        width: "100%",
        padding: "10px",
        margin: "10px 0",
        borderRadius: "5px",
        border: "1px solid #ccc",
        }}
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
    />
    <button
        style={{
        width: "100%",
        padding: "10px",
        borderRadius: "5px",
        border: "none",
        background: "#0077cc",
        color: "white",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        }}
        onClick={handleLogin}
        disabled={loading}
    >
        {loading ? "Вход..." : "Войти"}
    </button>
    </div>
);
}
