import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [needsAuth, setNeedsAuth] = useState(true);
  const [guestNickname, setGuestNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [room, setRoom] = useState(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [remotePeers, setRemotePeers] = useState({});
  const [peerMediaStatus, setPeerMediaStatus] = useState({});

  // Новые состояния для устройств
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({});

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/users/me");
        if (res.status === 200) {
          await joinRoomAuthorized();
        }
      } catch (err) {
        setNeedsAuth(true);
      }
    };

    checkAuth();
  }, []);

  const joinRoomAuthorized = async () => {
    try {
      setIsJoining(true);
      const res = await api.post("/rooms/join", {
        code: id,
        nickname: null,
      });

      const { token, code } = res.data;
      if (token) {
        localStorage.setItem("token_room", token);
      }

      setNeedsAuth(false);
      fetchRoom();
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Ошибка входа в комнату");
      setIsJoining(false);
    }
  };

  const handleGuestJoin = async (e) => {
    e?.preventDefault();

    if (!guestNickname.trim()) {
      setJoinError("Введите ваше имя");
      return;
    }

    try {
      setIsJoining(true);
      setJoinError("");

      const res = await api.post("/rooms/join", {
        code: id,
        nickname: guestNickname.trim(),
      });

      const { token, code } = res.data;
      if (token) {
        localStorage.setItem("token_room", token);
      }

      setNeedsAuth(false);
      fetchRoom();
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Ошибка входа в комнату");
      setIsJoining(false);
    }
  };

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
    } catch (e) {
      setError("Комната не найдена или доступ запрещен");
    }
  };

  // Получение списка устройств
  const getMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Ошибка получения устройств:", err);
    }
  };

  // Переключение устройства
  const switchDevice = async (deviceId, type) => {
    if (!localStreamRef.current) return;

    try {
      const constraints = {
        audio: type === "audio" ? { deviceId: { exact: deviceId } } : true,
        video: type === "video" ? { deviceId: { exact: deviceId } } : true,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Заменяем треки в текущем стриме
      if (type === "audio") {
        const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        if (oldAudioTrack) {
          localStreamRef.current.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        localStreamRef.current.addTrack(newAudioTrack);

        // Обновляем треки в peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) {
            sender.replaceTrack(newAudioTrack);
          }
        });

        setSelectedAudioDevice(deviceId);
      } else if (type === "video") {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);

        // Обновляем видео элемент
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // Обновляем треки в peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        });

        setSelectedVideoDevice(deviceId);
      }
    } catch (err) {
      console.error("Ошибка переключения устройства:", err);
      setError("Не удалось переключить устройство");
    }
  };

  // Демонстрация экрана
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Останавливаем демонстрацию
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      // Возвращаем камеру
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }

      setIsScreenSharing(false);
    } else {
      // Начинаем демонстрацию
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
          },
          audio: false,
        });

        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Заменяем видео трек на screen share для всех peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Показываем screen share локально
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Обработка остановки через браузерную кнопку
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Ошибка демонстрации экрана:", err);
        setError("Не удалось запустить демонстрацию экрана");
      }
    }
  };

  useEffect(() => {
    if (!room) return;

    let isInitialized = false;

    const initMediaAndWebSocket = async () => {
      if (isInitialized) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      isInitialized = true;

      try {
        // Получаем список устройств
        await getMediaDevices();

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: true,
          });
          setIsVideoOn(true);
        } catch (err) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            setIsVideoOn(false);
          } catch (audioErr) {
            throw new Error("Не удалось получить доступ к микрофону");
          }
        }

        localStreamRef.current = stream;

        setTimeout(() => {
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
        }, 200);

        const baseURL = api.defaults.baseURL;
        const host = baseURL.split("//")[1];
        const protocol = baseURL.startsWith("https") ? "wss:" : "ws:";

        const token = localStorage.getItem("token_room");

        const wsUrl = token
          ? `${protocol}//${host}/ws/room/${id}?token=${encodeURIComponent(token)}`
          : `${protocol}//${host}/ws/room/${id}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            setError("Не удалось подключиться к серверу");
          }
        }, 15000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
        };

        ws.onmessage = (event) => {
          handleWSMessage(event, stream);
        };

        ws.onerror = (e) => {
          clearTimeout(connectionTimeout);
          setError("Ошибка WebSocket подключения");
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);

          if (!event.wasClean) {
            setError("Соединение разорвано");
          }
        };
      } catch (e) {
        setError(e.message || "Ошибка инициализации");
      }
    };

    initMediaAndWebSocket();

    return () => {
      stopMediaAndCleanup();
    };
  }, [room]);

  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [room]);

  const handleWSMessage = async (event, localStream) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "active_peers":
          data.peers.forEach((peerToken) => {
            createPeerConnection(peerToken, localStream, true);
          });
          break;

        case "peer_joined":
          createPeerConnection(data.peer_token, localStream, false);
          break;

        case "peer_left":
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

        case "media_status":
          setPeerMediaStatus((prev) => ({
            ...prev,
            [data.from]: {
              audioOn: data.status.audioOn,
              videoOn: data.status.videoOn,
            },
          }));
          break;

        default:
      }
    } catch (e) {}
  };

  const createPeerConnection = (peerToken, localStream, initiator) => {
    try {
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionsRef.current[peerToken] = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        setRemotePeers((prev) => ({
          ...prev,
          [peerToken]: event.streams[0],
        }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
              target: peerToken,
            })
          );
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected") {
          closePeerConnection(peerToken);
        }
      };

      if (initiator) {
        createOffer(peerToken, pc);
      }
    } catch (e) {}
  };

  const createOffer = async (peerToken, pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(
        JSON.stringify({
          type: "offer",
          offer: offer,
          target: peerToken,
        })
      );
    } catch (e) {}
  };

  const handleOffer = async (offer, fromPeerToken, localStream) => {
    try {
      if (!peerConnectionsRef.current[fromPeerToken]) {
        createPeerConnection(fromPeerToken, localStream, false);
      }

      const pc = peerConnectionsRef.current[fromPeerToken];
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsRef.current.send(
        JSON.stringify({
          type: "answer",
          answer: answer,
          target: fromPeerToken,
        })
      );
    } catch (e) {}
  };

  const handleAnswer = async (answer, fromPeerToken) => {
    try {
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (e) {}
  };

  const handleIceCandidate = async (candidate, fromPeerToken) => {
    try {
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {}
  };

  const closePeerConnection = (peerToken) => {
    if (peerConnectionsRef.current[peerToken]) {
      peerConnectionsRef.current[peerToken].close();
      delete peerConnectionsRef.current[peerToken];
    }

    setRemotePeers((prev) => {
      const newPeers = { ...prev };
      delete newPeers[peerToken];
      return newPeers;
    });

    setPeerMediaStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[peerToken];
      return newStatus;
    });
  };

  const stopMediaAndCleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      screenStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((peerToken) => {
      peerConnectionsRef.current[peerToken].close();
    });
    peerConnectionsRef.current = {};

    if (wsRef.current) {
      const ws = wsRef.current;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      wsRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setRemotePeers({});
    setPeerMediaStatus({});
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newAudioState = audioTrack.enabled;
        setIsAudioOn(newAudioState);

        broadcastMediaStatus(newAudioState, isVideoOn);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoOn(newVideoState);

        broadcastMediaStatus(isAudioOn, newVideoState);
      }
    }
  };

  const broadcastMediaStatus = (audioOn, videoOn) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "media_status",
          status: {
            audioOn: audioOn,
            videoOn: videoOn,
          },
        })
      );
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    stopMediaAndCleanup();
    localStorage.removeItem("token_room");
    navigate("/");
  };

  const hasVideoTrack = localStreamRef.current?.getVideoTracks().length > 0;

  if (needsAuth) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: "420px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            padding: "40px",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 16px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
              }}
            >
              🎥
            </div>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "28px",
                fontWeight: "700",
                color: "#1a1a1a",
              }}
            >
              Присоединиться к звонку
            </h2>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "#999",
              }}
            >
              🎉 Друг приглашает тебя на видеозвонок
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "rgba(102, 126, 234, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(102, 126, 234, 0.2)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#999" }}>Комната: </span>
              <strong
                style={{
                  fontSize: "16px",
                  color: "#667eea",
                  fontFamily: "monospace",
                  letterSpacing: "1px",
                }}
              >
                {id}
              </strong>
            </div>
          </div>

          <form onSubmit={handleGuestJoin}>
            <input
              type="text"
              placeholder="Введите ваше имя"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              disabled={isJoining}
              style={{
                width: "100%",
                padding: "14px 18px",
                marginBottom: "15px",
                border: "2px solid #e0e0e0",
                borderRadius: "12px",
                fontSize: "15px",
                outline: "none",
                transition: "all 0.3s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e0e0e0";
                e.target.style.boxShadow = "none";
              }}
            />

            {joinError && (
              <div
                style={{
                  padding: "12px",
                  background: "#fee",
                  color: "#c33",
                  borderRadius: "10px",
                  fontSize: "14px",
                  marginBottom: "15px",
                  textAlign: "center",
                }}
              >
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isJoining ? "not-allowed" : "pointer",
                opacity: isJoining ? 0.7 : 1,
                transition: "all 0.3s",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
              }}
              onMouseEnter={(e) => {
                if (!isJoining) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
              }}
            >
              {isJoining ? "Подключение..." : "Войти в комнату"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1a1a1a",
          color: "#fff",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>❌ Ошибка</h2>
          <p style={{ fontSize: "16px", color: "#999" }}>{error}</p>
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#667eea",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1a1a1a",
          color: "#fff",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #333",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ fontSize: "16px", color: "#999" }}>Загрузка комнаты...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#fff",
      }}
    >
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .control-button {
            transition: all 0.3s ease;
          }
          .control-button:hover {
            transform: translateY(-3px);
            filter: brightness(1.2);
          }
          .control-button:active {
            transform: translateY(-1px);
          }
          .device-menu {
            animation: slideDown 0.2s ease;
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          padding: "20px 30px",
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 5px",
              fontSize: "24px",
              fontWeight: "700",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {room.name}
          </h1>
          <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
            {Object.keys(remotePeers).length + 1} участник(ов)
          </p>
        </div>

        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "10px 18px",
              borderRadius: "12px",
              backdropFilter: "blur(10px)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.6,
                  marginBottom: "3px",
                }}
              >
                Код комнаты:
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  fontFamily: "monospace",
                }}
              >
                {room.code}
              </div>
            </div>
            <button
              onClick={copyRoomLink}
              style={{
                padding: "8px 12px",
                background: copied
                  ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                  : "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "18px",
                transition: "all 0.3s",
              }}
              title={copied ? "Скопировано!" : "Копировать ссылку"}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>

          <button
            onClick={leaveRoom}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.3s",
              boxShadow: "0 4px 15px rgba(238, 9, 121, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(238, 9, 121, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(238, 9, 121, 0.4)";
            }}
          >
            🚪 Выйти
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns:
            Object.keys(remotePeers).length === 0
              ? "1fr"
              : "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          padding: "25px",
          overflow: "auto",
        }}
      >
        {/* Local Video */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
            borderRadius: "16px",
            overflow: "hidden",
            minHeight: "250px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            border: "2px solid rgba(102, 126, 234, 0.3)",
          }}
        >
          {true ? (
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStreamRef.current) {
                  el.srcObject = localStreamRef.current;
                }
              }}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: isVideoOn && !isScreenSharing ? "block" : "none",
              }}
            />
          ) : null}

          {isScreenSharing && (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#000",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    background: "rgba(17, 153, 142, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "40px",
                    boxShadow: "0 8px 32px rgba(17, 153, 142, 0.5)",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                >
                  🖥️
                </div>
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(10px)",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#fff",
                    border: "1px solid rgba(17, 153, 142, 0.3)",
                  }}
                >
                  Вы демонстрируете экран
                </div>
              </div>
            </>
          )}

          {!isVideoOn && !isScreenSharing && (
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "50px",
                boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
              }}
            >
              👤
            </div>
          )}

          <div
            style={{
              position: "absolute",
              bottom: "15px",
              left: "15px",
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(10px)",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <span>Вы</span>
            {isScreenSharing && <span style={{ color: "#38ef7d" }}>🖥️</span>}
            {!isVideoOn && <span style={{ opacity: 0.6 }}>📵</span>}
            {!isAudioOn && <span style={{ opacity: 0.6 }}>🔇</span>}
          </div>
        </div>

        {/* Remote Videos */}
        {Object.entries(remotePeers).map(([peerToken, stream]) => {
          const mediaStatus = peerMediaStatus[peerToken] || {
            audioOn: true,
            videoOn: true,
          };
          return (
            <RemoteVideo
              key={peerToken}
              stream={stream}
              peerToken={peerToken}
              audioOn={mediaStatus.audioOn}
              videoOn={mediaStatus.videoOn}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "25px",
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          flexWrap: "wrap",
        }}
      >
        {/* Микрофон */}
        <button
          onClick={toggleAudio}
          className="control-button"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: isAudioOn
              ? "rgba(255, 255, 255, 0.15)"
              : "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: isAudioOn
              ? "0 4px 15px rgba(255, 255, 255, 0.1)"
              : "0 4px 15px rgba(238, 9, 121, 0.4)",
          }}
          title={isAudioOn ? "Выключить микрофон" : "Включить микрофон"}
        >
          {isAudioOn ? "🎤" : "🔇"}
        </button>

        {/* Камера */}
        <button
          onClick={toggleVideo}
          disabled={!hasVideoTrack}
          className="control-button"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: !hasVideoTrack
              ? "rgba(255, 255, 255, 0.05)"
              : isVideoOn
              ? "rgba(255, 255, 255, 0.15)"
              : "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
            color: "#fff",
            fontSize: "24px",
            cursor: hasVideoTrack ? "pointer" : "not-allowed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: hasVideoTrack ? 1 : 0.5,
            boxShadow:
              hasVideoTrack && !isVideoOn
                ? "0 4px 15px rgba(238, 9, 121, 0.4)"
                : "0 4px 15px rgba(255, 255, 255, 0.1)",
          }}
          title={
            !hasVideoTrack
              ? "Камера недоступна"
              : isVideoOn
              ? "Выключить камеру"
              : "Включить камеру"
          }
        >
          {isVideoOn ? "📹" : "📵"}
        </button>

        {/* Демонстрация экрана */}
        <button
          onClick={toggleScreenShare}
          className="control-button"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: isScreenSharing
              ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              : "rgba(255, 255, 255, 0.15)",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: isScreenSharing
              ? "0 4px 15px rgba(17, 153, 142, 0.4)"
              : "0 4px 15px rgba(255, 255, 255, 0.1)",
          }}
          title={
            isScreenSharing
              ? "Остановить демонстрацию"
              : "Демонстрация экрана"
          }
        >
          {isScreenSharing ? "🛑" : "🖥️"}
        </button>

        {/* Настройки устройств */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              if (!showDeviceMenu) {
                getMediaDevices();
              }
              setShowDeviceMenu(!showDeviceMenu);
            }}
            className="control-button"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "none",
              background: showDeviceMenu
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "rgba(255, 255, 255, 0.15)",
              color: "#fff",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: showDeviceMenu
                ? "0 4px 15px rgba(102, 126, 234, 0.4)"
                : "0 4px 15px rgba(255, 255, 255, 0.1)",
            }}
            title="Настройки устройств"
          >
            ⚙️
          </button>

          {showDeviceMenu && (
            <div
              className="device-menu"
              style={{
                position: "absolute",
                bottom: "75px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(30, 30, 30, 0.95)",
                backdropFilter: "blur(20px)",
                padding: "20px",
                borderRadius: "16px",
                minWidth: "280px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                zIndex: 1000,
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Настройки устройств
              </h3>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    marginBottom: "8px",
                    opacity: 0.8,
                  }}
                >
                  🎤 Микрофон
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => switchDevice(e.target.value, "audio")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {audioDevices.map((device) => (
                    <option
                      key={device.deviceId}
                      value={device.deviceId}
                      style={{ background: "#1a1a1a", color: "#fff" }}
                    >
                      {device.label || `Микрофон ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    marginBottom: "8px",
                    opacity: 0.8,
                  }}
                >
                  📹 Камера
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => switchDevice(e.target.value, "video")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {videoDevices.map((device) => (
                    <option
                      key={device.deviceId}
                      value={device.deviceId}
                      style={{ background: "#1a1a1a", color: "#fff" }}
                    >
                      {device.label || `Камера ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Remote Video Component
function RemoteVideo({ stream, peerToken, audioOn, videoOn }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, peerToken]);

  const hasVideoTrack = stream?.getVideoTracks().length > 0;
  const isVideoEnabled = stream?.getVideoTracks()[0]?.enabled;

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        borderRadius: "16px",
        overflow: "hidden",
        minHeight: "250px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        border: "2px solid rgba(255, 255, 255, 0.1)",
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
          display:
            hasVideoTrack && isVideoEnabled && videoOn ? "block" : "none",
        }}
      />

      {(!hasVideoTrack || !isVideoEnabled || !videoOn) && (
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "50px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
          }}
        >
          👤
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "15px",
          left: "15px",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(10px)",
          padding: "8px 16px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <span>Участник {peerToken.substring(0, 8)}</span>
        {!videoOn && <span style={{ opacity: 0.6 }}>📵</span>}
        {!audioOn && <span style={{ opacity: 0.6 }}>🔇</span>}
      </div>

      {!audioOn && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(238, 9, 121, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            animation: "pulse 2s ease-in-out infinite",
          }}
          title="Микрофон выключен"
        >
          🔇
        </div>
      )}
    </div>
  );
}
