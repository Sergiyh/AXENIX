import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const getMe = async () => {
    try {
      const res = await api.get("/users/me");
      setUser(res.data);
    } catch (error) {
      console.error(error);
      setUser(null);
    }
  };

  useEffect(() => {
    getMe();
  }, []);

  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm(
      "Вы уверены, что хотите удалить свой профиль? Это действие нельзя отменить."
    );
    if (!confirmDelete) return;

    try {
      await api.delete("/users/me");
      try {
      } catch (logoutError) {
        console.warn("Ошибка при logout (можно игнорировать):", logoutError);
      }

      alert("Профиль успешно удалён.");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить профиль. Попробуйте ещё раз.");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "#181818",
        color: "#E8EAED",
        padding: "50px 20px",
        fontFamily: "Inter, Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "30px",
            alignItems: "center",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 600 }}>Профиль</h1>

          <button
            onClick={() => navigate("/rooms")}
            style={{
              padding: "10px 16px",
              background: "#303134",
              border: "1px solid #5f6368",
              borderRadius: "10px",
              color: "#E8EAED",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#3C4043")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#303134")}
          >
            ← Назад
          </button>
        </div>

        {!user ? (
          <div style={{ opacity: 0.7 }}>Загрузка профиля...</div>
        ) : (
          <div
            style={{
              background: "#202124",
              borderRadius: "14px",
              padding: "24px",
              border: "1px solid #2b2b2b",
              transition: "0.2s",
            }}
          >
            <p style={{ fontSize: "15px", marginBottom: "10px" }}>
              <strong>Ник:</strong> {user.nickname}
            </p>
            <p style={{ fontSize: "15px", opacity: 0.85, marginBottom: "20px" }}>
              <strong>Дата регистрации:</strong>{" "}
              {new Date(user.created_at).toLocaleString()}
            </p>

            <button
              onClick={handleDeleteProfile}
              style={{
                padding: "10px 16px",
                background: "#b71c1c",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#c62828")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#b71c1c")
              }
            >
              Удалить профиль
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
