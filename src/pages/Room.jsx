import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Room() {
  const { id } = useParams(); // room_code
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [remotePeers, setRemotePeers] = useState({}); // {peerToken: stream}

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({}); // {peerToken: RTCPeerConnection}

  // ICE серверы
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Загрузка комнаты
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${id}`);
        setRoom(res.data);
      } catch (e) {
        setError("Комната не найдена или доступ запрещен");
      }
    };
    fetchRoom();
  }, [id]);

  // Инициализация медиа и WebSocket
  useEffect(() => {
    if (!room) return;

    const initMediaAndWebSocket = async () => {
      try {
        // Получить доступ к камере/микрофону
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const baseURL = api.defaults.baseURL; 
        const host = baseURL.split("//")[1]; 
        const wsUrl = `${protocol}//${host}/ws/${id}`; 

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("✅ WebSocket подключен");
        };

        ws.onmessage = (event) => handleWSMessage(event, stream);

        ws.onerror = (e) => {
          console.error("❌ WebSocket ошибка:", e);
          setError("Ошибка подключения к серверу");
        };

        ws.onclose = () => {
          console.log("WebSocket закрыт");
        };
      } catch (e) {
        console.error("Ошибка доступа к камере/микрофону:", e);
        setError("Разрешите доступ к камере и микрофону");
      }
    };

    initMediaAndWebSocket();

    return () => {
      stopMediaAndCleanup();
    };
  }, [room, id]);

  // Обработка WebSocket сообщений
  const handleWSMessage = async (event, localStream) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 Получено сообщение:", data.type);

      switch (data.type) {
        case "active_peers":
          // Подключиться к существующим пользователям
          data.peers.forEach((peerToken) => {
            createPeerConnection(peerToken, localStream, true);
          });
          break;

        case "peer_joined":
          // Новый пользователь подключился
          createPeerConnection(data.peer_token, localStream, false);
          break;

        case "peer_left":
          // Пользователь отключился
          closePeerConnection(data.peer_token);
          break;

        case "offer":
          await handleOffer(data.offer, data.from, localStream);
          break;

        case "answer":
          await handleAnswer(data.answer, data.from);
          break;

        case "ice_candidate":
          await handleIceCandidate(data.candidate, data.from);
          break;

        default:
          console.log("⚠️ Неизвестный тип сообщения:", data.type);
      }
    } catch (e) {
      console.error("❌ Ошибка обработки сообщения:", e);
    }
  };

  // Создать peer connection
  const createPeerConnection = (peerToken, localStream, initiator) => {
    try {
      console.log(`🔗 Создание соединения с ${peerToken}`, { initiator });

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionsRef.current[peerToken] = pc;

      // Добавить локальные треки
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Получение удаленного стрима
      pc.ontrack = (event) => {
        console.log("📹 Получен удаленный трек от", peerToken);
        setRemotePeers((prev) => ({
          ...prev,
          [peerToken]: event.streams[0],
        }));
      };

      // Отправка ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          console.log("🧊 Отправка ICE candidate");
          wsRef.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
              target: peerToken,
            })
          );
        }
      };

      // Отслеживание состояния соединения
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE состояние ${peerToken}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected") {
          closePeerConnection(peerToken);
        }
      };

      // Если мы инициатор - создаем offer
      if (initiator) {
        createOffer(peerToken, pc);
      }
    } catch (e) {
      console.error("❌ Ошибка создания peer connection:", e);
    }
  };

  // Создать offer
  const createOffer = async (peerToken, pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("📤 Отправка offer к", peerToken);
      wsRef.current.send(
        JSON.stringify({
          type: "offer",
          offer: offer,
          target: peerToken,
        })
      );
    } catch (e) {
      console.error("❌ Ошибка создания offer:", e);
    }
  };

  // Обработать offer
  const handleOffer = async (offer, fromPeerToken, localStream) => {
    try {
      console.log("📥 Получен offer от", fromPeerToken);

      if (!peerConnectionsRef.current[fromPeerToken]) {
        createPeerConnection(fromPeerToken, localStream, false);
      }

      const pc = peerConnectionsRef.current[fromPeerToken];
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("📤 Отправка answer к", fromPeerToken);
      wsRef.current.send(
        JSON.stringify({
          type: "answer",
          answer: answer,
          target: fromPeerToken,
        })
      );
    } catch (e) {
      console.error("❌ Ошибка обработки offer:", e);
    }
  };

  // Обработать answer
  const handleAnswer = async (answer, fromPeerToken) => {
    try {
      console.log("📥 Получен answer от", fromPeerToken);
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (e) {
      console.error("❌ Ошибка обработки answer:", e);
    }
  };

  // Обработать ICE candidate
  const handleIceCandidate = async (candidate, fromPeerToken) => {
    try {
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("🧊 Добавлен ICE candidate от", fromPeerToken);
      }
    } catch (e) {
      console.error("❌ Ошибка добавления ICE candidate:", e);
    }
  };

  // Закрыть peer connection
  const closePeerConnection = (peerToken) => {
    console.log("🔌 Закрытие соединения с", peerToken);

    if (peerConnectionsRef.current[peerToken]) {
      peerConnectionsRef.current[peerToken].close();
      delete peerConnectionsRef.current[peerToken];
    }

    setRemotePeers((prev) => {
      const updated = { ...prev };
      delete updated[peerToken];
      return updated;
    });
  };

  // Остановить медиа и cleanup
  const stopMediaAndCleanup = () => {
    console.log("🧹 Cleanup...");

    // Остановить локальный стрим
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    // Закрыть все peer connections
    Object.keys(peerConnectionsRef.current).forEach((peerToken) => {
      peerConnectionsRef.current[peerToken].close();
    });
    peerConnectionsRef.current = {};

    // Закрыть WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Очистить видео элемент
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setRemotePeers({});
  };

  // Переключить аудио
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  // Переключить видео
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  // Копировать ссылку
  const copyRoomLink = async () => {
    const roomLink = `${window.location.origin}/login?room=${id}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования:", err);
    }
  };

  // Выйти из комнаты
  const leaveRoom = async () => {
    try {
      await api.delete("/rooms/leave");
    } catch (e) {
      console.error("Ошибка выхода:", e);
    }
    stopMediaAndCleanup();
    navigate("/rooms");
  };

  // Экран ошибки
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
          onClick={() => navigate("/rooms")}
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
          Вернуться
        </button>
      </div>
    );
  }

  // Экран загрузки
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
      {/* Header */}
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
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>
            Комната {room.code}
          </h2>
          <div style={{ fontSize: "13px", opacity: 0.7 }}>
            {Object.keys(remotePeers).length + 1} участников
          </div>
        </div>

        {/* Код комнаты и копирование */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#3c4043",
            padding: "10px 15px",
            borderRadius: "8px",
            marginRight: "15px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>Код:</span>
            <span style={{ fontSize: "16px", fontWeight: "600", letterSpacing: "1px" }}>
              {room.code}
            </span>
          </div>
          <button
            onClick={copyRoomLink}
            style={{
              padding: "8px 12px",
              background: copied ? "#1a73e8" : "#555",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              transition: "0.2s",
            }}
          >
            {copied ? "✓" : "📋"}
          </button>
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

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "15px",
          padding: "20px",
          overflow: "auto",
        }}
      >
        {/* Локальное видео */}
        <div
          style={{
            position: "relative",
            background: "#000",
            borderRadius: "12px",
            overflow: "hidden",
            minHeight: "200px",
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              background: "rgba(0,0,0,0.7)",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Вы {!isVideoOn && "📵"} {!isAudioOn && "🔇"}
          </div>
        </div>

        {/* Удаленные видео */}
        {Object.entries(remotePeers).map(([peerToken, stream]) => (
          <RemoteVideo key={peerToken} stream={stream} peerToken={peerToken} />
        ))}
      </div>

      {/* Controls */}
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

// Компонент для отображения удаленного видео
function RemoteVideo({ stream, peerToken }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      style={{
        position: "relative",
        background: "#000",
        borderRadius: "12px",
        overflow: "hidden",
        minHeight: "200px",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          background: "rgba(0,0,0,0.7)",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Участник {peerToken.substring(0, 8)}
      </div>
    </div>
  );
}
