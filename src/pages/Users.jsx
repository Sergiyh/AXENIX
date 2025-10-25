import { useState, useEffect } from "react";
import { api } from "../api/client";
import Navbar from "../components/Navbar";

export default function Users() {
const [users, setUsers] = useState([]);
const [nickname, setNickname] = useState("");
const [password, setPassword] = useState("");

const fetchUsers = async () => {
    try {
    const res = await api.get("/users");
    setUsers(res.data);
    } catch {
    alert("Ошибка загрузки пользователей");
    }
};

const createUser = async () => {
    try {
    await api.post("/auth/register", {
        nickname: nickname.trim(),
        password: password.trim(),
    });

    setNickname("");
    setPassword("");
    fetchUsers();
    alert("✅ Пользователь создан и авторизован");
    } catch {
    alert("❌ Ошибка регистрации");
    }
};

const deleteUser = async (id) => {
    try {
    await api.delete(`/users/${id}`);
    fetchUsers();
    alert("🗑 Пользователь удалён");
    } catch {
    alert("❌ Ошибка удаления");
    }
};

useEffect(() => {
    fetchUsers();
}, []);

return (
    <div>
    <Navbar />
    <h2 style={{ textAlign: "center" }}>Пользователи</h2>

    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
        style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        placeholder="Никнейм"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        />
        <input
        style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />
        <button
    style={{ padding: "10px", borderRadius: "5px", border: "none", background: "#0077cc", color: "white", cursor: "pointer" }}
    onClick={createUser}
        >
    Создать
        </button>
</div>

<ul style={{ listStyle: "none", padding: 0 }}>
        {users.map((user) => (
    <li
            key={user.id}чччч
            style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fff",
            padding: "10px",
            borderRadius: "5px",
            marginBottom: "5px",
            }}
        >
            {user.nickname} (ID: {user.id})
            <button
            style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: "none",
                background: "#cc0000",
                color: "white",
                cursor: "pointer",
            }}
            onClick={() => deleteUser(user.id)}
            >
            Удалить
            </button>
        </li>
        ))}
    </ul>
    </div>
);
}
