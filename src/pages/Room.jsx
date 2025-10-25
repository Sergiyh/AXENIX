import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Room() {
  const { id } = useParams(); // room_code
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState("");

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const wsRef = useRef(null);

  // Загрузка комнаты
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${id}`);
        setRoom(res.data);
        setUsers(res.data.room_users || []);
      } catch (e) {
        setError("Комната не найдена или доступ запрещен");
      }
    };
    fetchRoom();
  }, [id]);

  // Получение медиа и WebSocket
  useEffect(() => {
    if (!room) return;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // WebSocket подключение
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host.replace(':5173', ':8000')}/ws/${id}`);
        wsRef.current = ws;

        ws.onopen = () => console.log("WebSocket подключен");
        ws.onmessage = handleWSMessage;
        ws.onerror = (e) => console.error("WebSocket ошибка:", e);
        ws.onclose = () => console.log("WebSocket закрыт");
      } catch (e) {
        setError("Ошибка доступа к камере/микрофону. Разрешите доступ в браузере.");
      }
    };

    startMedia();

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [room, id]);

  const handleWSMessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "user_joined") {
        setUsers((prev) => {
          // Проверяем что пользователь еще не в списке
          if (prev.find((u) => u.user_nickname === data.nickname)) {
            return prev;
          }
          return [...prev, { user_nickname: data.nickname }];
        });
      } else if (data.type === "user_left") {
        setUsers((prev) => prev.filter((u) => u.user_nickname !== data.nickname));
      }
    } catch (e) {
      console.error("Ошибка обработки сообщения:", e);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const leaveRoom = async () => {
    try {
      await api.delete("/rooms/leave");
    } catch (e) {
      console.error("Ошибка выхода:", e);
    }
    navigate("/");
  };

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#202124",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "#d93025" }}>{error}</h2>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "12px 24px",
            background: "#1a73e8",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#202124",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
        height: "100vh",
        background: "#202124",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Хедер */}
      <div
        style={{
          padding: "20px 30px",
          background: "#303134",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #3c4043",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "4px" }}>
            Комната {room.code}
          </h2>
          <div style={{ fontSize: "13px", opacity: 0.7 }}>
            {users.length} {users.length === 1 ? "участник" : "участников"}
          </div>
        </div>
        <button
          onClick={leaveRoom}
          style={{
            padding: "8px 16px",
            background: "#d93025",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Выйти
        </button>
      </div>

      {/* Основная область */}
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "20px",
          gap: "20px",
        }}
      >
        {/* Видео */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "900px",
              background: "#000",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "15px",
                left: "15px",
                background: "rgba(0,0,0,0.7)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Вы
            </div>
          </div>
        </div>

        {/* Сайдбар с участниками */}
        <div
          style={{
            width: "280px",
            background: "#303134",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>
            Участники ({users.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map((user, index) => (
              <div
                key={index}
                style={{
                  padding: "12px",
                  background: "#3c4043",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                {user.user_nickname}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Панель управления */}
      <div
        style={{
          padding: "20px",
          background: "#303134",
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          borderTop: "1px solid #3c4043",
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: isAudioOn ? "#3c4043" : "#d93025",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          title={isAudioOn ? "Выключить микрофон" : "Включить микрофон"}
        >
          {isAudioOn ? "🎤" : "🔇"}
        </button>
        <button
          onClick={toggleVideo}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: isVideoOn ? "#3c4043" : "#d93025",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          title={isVideoOn ? "Выключить камеру" : "Включить камеру"}
        >
          {isVideoOn ? "📹" : "📵"}
        </button>
      </div>
    </div>
  );
}
