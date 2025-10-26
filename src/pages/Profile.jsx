import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    password: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const navigate = useNavigate();

  const getMe = async () => {
    try {
      const res = await api.get("/users/me");
      setUser(res.data);
      setFormData({
        nickname: res.data.nickname,
        password: "",
      });
    } catch (error) {
      console.error(error);
      setUser(null);
    }
  };

  useEffect(() => {
    getMe();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match(/image\/(jpg|jpeg|png|webp)/)) {
        alert("Разрешены только JPG, PNG, WEBP");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Максимальный размер файла: 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      // Обновляем nickname и/или пароль
      const updateData = {};
      if (formData.nickname !== user.nickname) {
        updateData.nickname = formData.nickname;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }

      if (Object.keys(updateData).length > 0) {
        await api.put(`/users/${user.id}`, updateData);
      }

     // 2. Обновляем аватарку
      if (avatarFile) {
        const formDataFile = new FormData();  // ← Другое имя!
        formDataFile.append("avatar", avatarFile);
        
        console.log('Загружаем файл:', avatarFile.name);
        
        await api.patch("/users/avatar", formDataFile);
      }

      alert("Профиль обновлён!");
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setFormData({ ...formData, password: "" });
      await getMe(); // Перезагружаем данные
    } catch (error) {
      console.error(error);
      alert("Ошибка при обновлении профиля");
    }
  };

  

  const avatarUrl = avatarPreview || (user?.avatar ? `https://api.idenmarket.com${user.avatar}` : null);

  return (
    <div
      style={{
        minHeight: "100vh",
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
          width: "450px",
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
            {/* Аватарка */}
            <div style={{ marginBottom: "25px" }}>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 15px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid rgba(255, 107, 0, 0.5)",
                  background: "rgba(255, 255, 255, 0.1)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "48px",
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    👤
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    style={{ display: "none" }}
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      background: "rgba(255, 107, 0, 0.3)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      transition: "0.3s",
                    }}
                  >
                    Выбрать аватар
                  </label>
                  {avatarFile && (
                    <p style={{ fontSize: "12px", marginTop: "8px", opacity: 0.8 }}>
                      {avatarFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isEditing ? (
              /* Режим просмотра */
              <>
                <div
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "20px",
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
                  onClick={() => setIsEditing(true)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255, 107, 0, 0.5)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "0.3s",
                    marginBottom: "10px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255, 107, 0, 0.7)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255, 107, 0, 0.5)")
                  }
                >
                  Редактировать профиль
                </button>
              </>
            ) : (
              /* Режим редактирования */
              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: "15px", textAlign: "left" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "14px",
                      opacity: 0.9,
                    }}
                  >
                    Никнейм:
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: "20px", textAlign: "left" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "14px",
                      opacity: 0.9,
                    }}
                  >
                    Новый пароль (оставьте пустым, если не хотите менять):
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#4caf50",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#66bb6a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#4caf50")
                    }
                  >
                    Сохранить
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      setFormData({
                        nickname: user.nickname,
                        password: "",
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")
                    }
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
