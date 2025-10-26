import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import VideoCallChat from '../components/VideoCallChat';

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
  const [speakingStatus, setSpeakingStatus] = useState({});
  const [handRaised, setHandRaised] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("connected");

  const [unreadCount, setUnreadCount] = useState(0);  
  const [isChatOpen, setIsChatOpen] = useState(false)
  
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

  // Для анализа аудио
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDataRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Для восстановления соединения
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  // Локальное состояние для восстановления
  const localStateRef = useRef({
    audioOn: true,
    videoOn: true,
    handRaised: false,
    screenSharing: false
  });

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Функция восстановления соединения
  const reconnect = async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError("Не удалось восстановить соединение. Пожалуйста, перезайдите в комнату.");
      return;
    }

    setConnectionStatus("reconnecting");
    reconnectAttemptsRef.current++;

    console.log(`Попытка переподключения ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);

    try {
      await initWebSocketConnection();
      reconnectAttemptsRef.current = 0;
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Ошибка переподключения:", error);
      reconnectTimeoutRef.current = setTimeout(reconnect, reconnectDelay * reconnectAttemptsRef.current);
    }
  };

  // Инициализация WebSocket соединения
  const initWebSocketConnection = async () => {
    return new Promise((resolve, reject) => {
      try {
        const baseURL = api.defaults.baseURL;
        const host = baseURL.split("//")[1];
        const protocol = baseURL.startsWith("https") ? "wss:" : "ws:";

        const token = localStorage.getItem("token_room");

        const wsUrl = token
          ? `${protocol}//${host}/ws/room/${id}?token=${encodeURIComponent(token)}&reconnect=true`
          : `${protocol}//${host}/ws/room/${id}?reconnect=true`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            reject(new Error("Timeout подключения"));
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("WebSocket соединение установлено");
          
          // Восстанавливаем локальное состояние
          restoreLocalState();
          resolve();
        };

        ws.onmessage = (event) => {
          handleWSMessage(event, localStreamRef.current);
        };

        ws.onerror = (e) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket ошибка:", e);
          reject(e);
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          
          if (!event.wasClean && connectionStatus !== "reconnecting") {
            console.log("Соединение разорвано, пытаемся переподключиться...");
            reconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  };

  // Восстановление локального состояния после переподключения
  const restoreLocalState = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Восстанавливаем статус медиа
      broadcastMediaStatus(localStateRef.current.audioOn, localStateRef.current.videoOn);
      
      // Восстанавливаем статус поднятой руки
      if (localStateRef.current.handRaised) {
        wsRef.current.send(
          JSON.stringify({
            type: "hand_raised",
            isRaised: true,
            restore: true
          })
        );
      }

      // Запрашиваем актуальное состояние комнаты
      wsRef.current.send(
        JSON.stringify({
          type: "get_room_state"
        })
      );

      console.log("Локальное состояние восстановлено");
    }
  };

  // Сохранение локального состояния
  const saveLocalState = () => {
    localStateRef.current = {
      audioOn: isAudioOn,
      videoOn: isVideoOn,
      handRaised: handRaised.local || false,
      screenSharing: isScreenSharing
    };
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

    // Сохраняем состояние перед закрытием/перезагрузкой
    const handleBeforeUnload = () => {
      saveLocalState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
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
      await fetchRoom();
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
      await fetchRoom();
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Ошибка входа в комнату");
      setIsJoining(false);
    }
  };

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
      
      // После получения данных комнаты инициализируем медиа и WebSocket
      await initMediaAndWebSocket();
    } catch (e) {
      setError("Комната не найдена или доступ запрещен");
    }
  };

  // Объединенная функция инициализации медиа и WebSocket
  const initMediaAndWebSocket = async () => {
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
        localStateRef.current.videoOn = true;
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setIsVideoOn(false);
          localStateRef.current.videoOn = false;
        } catch (audioErr) {
          throw new Error("Не удалось получить доступ к микрофону");
        }
      }

      localStreamRef.current = stream;

      // Инициализируем анализатор аудио
      if (stream.getAudioTracks().length > 0) {
        initAudioAnalyser(stream);
      }

      setTimeout(() => {
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
        }
      }, 200);

      // Инициализируем WebSocket соединение
      await initWebSocketConnection();

    } catch (e) {
      setError(e.message || "Ошибка инициализации");
    }
  };

  // Функция для инициализации анализатора аудио
  const initAudioAnalyser = (stream) => {
    if (!stream.getAudioTracks().length) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      audioDataRef.current = dataArray;
      
      startSpeakingDetection();
    } catch (error) {
      console.error("Ошибка инициализации анализатора аудио:", error);
    }
  };

  // Функция для обнаружения речи
  const startSpeakingDetection = () => {
    if (!analyserRef.current || !audioDataRef.current) return;

    const checkSpeaking = () => {
      analyserRef.current.getByteFrequencyData(audioDataRef.current);
      
      // Вычисляем средний уровень громкости
      const average = audioDataRef.current.reduce((a, b) => a + b) / audioDataRef.current.length;
      
      // Порог для определения речи
      const isSpeaking = average > 30;
      
      // Обновляем статус только если он изменился
      setSpeakingStatus(prev => {
        if (prev.local !== isSpeaking) {
          // Отправляем статус другим участникам
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "speaking_status",
                isSpeaking: isSpeaking,
              })
            );
          }
          return { ...prev, local: isSpeaking };
        }
        return prev;
      });
      
      animationFrameRef.current = requestAnimationFrame(checkSpeaking);
    };
    
    animationFrameRef.current = requestAnimationFrame(checkSpeaking);
  };

  // Функция для остановки анализа аудио
  const stopAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const toggleHandRaise = () => {
    const newHandRaised = !handRaised.local;
    setHandRaised(prev => ({ ...prev, local: newHandRaised }));
    localStateRef.current.handRaised = newHandRaised;
    
    // Отправляем статус другим участникам
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "hand_raised",
          isRaised: newHandRaised,
        })
      );
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
      localStateRef.current.screenSharing = false;
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
        localStateRef.current.screenSharing = true;
      } catch (err) {
        console.error("Ошибка демонстрации экрана:", err);
        setError("Не удалось запустить демонстрацию экрана");
      }
    }
  };

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
          // Восстанавливаем соединения с активными пирами
          data.peers.forEach((peerToken) => {
            if (!peerConnectionsRef.current[peerToken]) {
              createPeerConnection(peerToken, localStream, true);
            }
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

        case "speaking_status":
          setSpeakingStatus(prev => ({
            ...prev,
            [data.from]: data.isSpeaking,
          }));
          break;
          
        case "hand_raised":
          setHandRaised(prev => ({
            ...prev,
            [data.from]: data.isRaised,
          }));
          break;
          
        case "user_role":
          if (data.userToken === localStorage.getItem("token_room")) {
            setIsHost(data.isHost);
          }
          break;

        case "room_state":
          // Восстанавливаем полное состояние комнаты
          if (data.participants) {
            setParticipants(data.participants);
            
            // Восстанавливаем статусы участников
            const newMediaStatus = {};
            const newSpeakingStatus = {};
            const newHandRaised = {};
            
            data.participants.forEach(participant => {
              if (participant.mediaStatus) {
                newMediaStatus[participant.token] = participant.mediaStatus;
              }
              if (participant.speaking !== undefined) {
                newSpeakingStatus[participant.token] = participant.speaking;
              }
              if (participant.handRaised !== undefined) {
                newHandRaised[participant.token] = participant.handRaised;
              }
            });
            
            setPeerMediaStatus(newMediaStatus);
            setSpeakingStatus(newSpeakingStatus);
            setHandRaised(newHandRaised);
          }
          break;

        case "reconnect_success":
          console.log("Успешное переподключение, состояние восстановлено");
          setConnectionStatus("connected");
          break;

        default:
      }
    } catch (e) {
      console.error("Ошибка обработки сообщения:", e);
    }
  };

  const createPeerConnection = (peerToken, localStream, initiator) => {
    try {
      // Закрываем существующее соединение если есть
      if (peerConnectionsRef.current[peerToken]) {
        peerConnectionsRef.current[peerToken].close();
      }

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
        const state = pc.iceConnectionState;
        console.log(`Peer ${peerToken} ICE state:`, state);
        
        if (state === "disconnected" || state === "failed") {
          console.log(`Соединение с ${peerToken} разорвано, пытаемся восстановить...`);
          // Пытаемся восстановить соединение
          setTimeout(() => {
            if (pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "checking") {
              createPeerConnection(peerToken, localStream, true);
            }
          }, 2000);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Peer ${peerToken} connection state:`, pc.connectionState);
      };

      if (initiator) {
        createOffer(peerToken, pc);
      }
    } catch (e) {
      console.error("Ошибка создания peer connection:", e);
    }
  };

  const createOffer = async (peerToken, pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "offer",
            offer: offer,
            target: peerToken,
          })
        );
      }
    } catch (e) {
      console.error("Ошибка создания offer:", e);
    }
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

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "answer",
            answer: answer,
            target: fromPeerToken,
          })
        );
      }
    } catch (e) {
      console.error("Ошибка обработки offer:", e);
    }
  };

  const handleAnswer = async (answer, fromPeerToken) => {
    try {
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (e) {
      console.error("Ошибка обработки answer:", e);
    }
  };

  const handleIceCandidate = async (candidate, fromPeerToken) => {
    try {
      const pc = peerConnectionsRef.current[fromPeerToken];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error("Ошибка обработки ICE candidate:", e);
    }
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

    setSpeakingStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[peerToken];
      return newStatus;
    });

    setHandRaised((prev) => {
      const newStatus = { ...prev };
      delete newStatus[peerToken];
      return newStatus;
    });
  };

  const stopMediaAndCleanup = () => {
    // Останавливаем переподключение
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

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

    stopAudioAnalyser();

    setRemotePeers({});
    setPeerMediaStatus({});
    setSpeakingStatus({});
    setHandRaised({});
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newAudioState = audioTrack.enabled;
        setIsAudioOn(newAudioState);
        localStateRef.current.audioOn = newAudioState;

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
        localStateRef.current.videoOn = newVideoState;

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

  // Ручное переподключение
  const manualReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnect();
  };

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
            0%, 100% { 
              opacity: 1;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.05);
            }
          }
          @keyframes pulse-slow {
            0%, 100% { 
              opacity: 1;
              transform: scale(1);
            }
            50% { 
              opacity: 0.8;
              transform: scale(1.1);
            }
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

      {/* Индикатор статуса соединения */}
      {connectionStatus !== "connected" && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: connectionStatus === "reconnecting" 
              ? "rgba(255, 152, 0, 0.9)" 
              : "rgba(244, 67, 54, 0.9)",
            backdropFilter: "blur(10px)",
            padding: "12px 24px",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 10000,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {connectionStatus === "reconnecting" ? (
            <>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #fff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span>Переподключение... ({reconnectAttemptsRef.current}/{maxReconnectAttempts})</span>
              <button
                onClick={manualReconnect}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Ускорить
              </button>
            </>
          ) : (
            <>
              <span>❌ Соединение прервано</span>
              <button
                onClick={manualReconnect}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Переподключить
              </button>
            </>
          )}
        </div>
      )}

       <VideoCallChat 
        roomCode={id} 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
      />

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
            {connectionStatus !== "connected" && " • Соединение..."}
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

          {/* Индикатор говорящего для локального видео */}
          {speakingStatus.local && (
            <div
              style={{
                position: "absolute",
                top: "15px",
                left: "15px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(76, 175, 80, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                animation: "pulse 1s ease-in-out infinite",
                border: "2px solid #fff",
                zIndex: 10,
              }}
              title="Вы говорите"
            >
              🎤
            </div>
          )}

          {/* Индикатор поднятой руки для локального видео */}
          {handRaised.local && (
            <div
              style={{
                position: "absolute",
                top: speakingStatus.local ? "65px" : "15px",
                left: "15px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255, 152, 0, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                animation: "pulse 2s ease-in-out infinite",
                border: "2px solid #fff",
                zIndex: 10,
              }}
              title="Вы подняли руку"
            >
              ✋
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
            {isHost && <span style={{ color: "#ffeb3b" }}>👑</span>}
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
              isSpeaking={speakingStatus[peerToken]}
              isHandRaised={handRaised[peerToken]}
              connectionStatus={connectionStatus}
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
        {/* Кнопка поднятия руки */}
        <button
          onClick={toggleHandRaise}
          className="control-button"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: handRaised.local
              ? "linear-gradient(135deg, #ff9800 0%, #ff5722 100%)"
              : "rgba(255, 255, 255, 0.15)",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: handRaised.local
              ? "0 4px 15px rgba(255, 152, 0, 0.4)"
              : "0 4px 15px rgba(255, 255, 255, 0.1)",
          }}
          title={handRaised.local ? "Опустить руку" : "Поднять руку"}
        >
          {handRaised.local ? "✋" : "🤚"}
        </button>

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
function RemoteVideo({ stream, peerToken, audioOn, videoOn, isSpeaking, isHandRaised, connectionStatus }) {
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

      {/* Индикатор говорящего */}
      {isSpeaking && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "15px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(76, 175, 80, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            animation: "pulse 1s ease-in-out infinite",
            border: "2px solid #fff",
            zIndex: 10,
          }}
          title="Говорит"
        >
          🎤
        </div>
      )}

      {/* Индикатор поднятой руки */}
      {isHandRaised && (
        <div
          style={{
            position: "absolute",
            top: isSpeaking ? "65px" : "15px",
            left: "15px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 152, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            animation: "pulse 2s ease-in-out infinite",
            border: "2px solid #fff",
            zIndex: 10,
          }}
          title="Поднял руку"
        >
          ✋
        </div>
      )}

      {/* Индикатор проблем с соединением */}
      {connectionStatus !== "connected" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            padding: "12px 20px",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "600",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div style={{ marginBottom: "8px" }}>🔄</div>
          <div>Переподключение...</div>
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
