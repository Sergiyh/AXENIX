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
        background:
          "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 40%, #ff6b00 120%)",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          padding: "35px",
          borderRadius: "15px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#fff" }}>
            Профиль
          </h2>
          <button
            onClick={() => navigate("/rooms")}
            style={{
              padding: "8px 14px",
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              transition: "0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255, 107, 0, 0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")
            }
          >
            ← Назад
          </button>
        </div>

        {!user ? (
          <p style={{ opacity: 0.7 }}>Загрузка профиля...</p>
        ) : (
          <>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "25px",
                border: "1px solid rgba(255,255,255,0.1)",
                textAlign: "left",
              }}
            >
              <p style={{ fontSize: "15px", marginBottom: "10px" }}>
                <strong>Ник:</strong> {user.nickname}
              </p>
              <p style={{ fontSize: "14px", opacity: 0.85 }}>
                <strong>Дата регистрации:</strong>{" "}
                {new Date(user.created_at).toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleDeleteProfile}
              style={{
                width: "100%",
                padding: "12px",
                background: "#ff3b3b",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "0.3s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ff4f1a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#ff3b3b")
              }
            >
              Удалить профиль
            </button>
          </>
        )}
      </div>
    </div>
  );
}
