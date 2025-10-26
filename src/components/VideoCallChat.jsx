import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import JSEncrypt from 'jsencrypt';

// Генерация RSA ключей 1024 bit
const generateKeyPair = () => {
  const crypt = new JSEncrypt({ default_key_size: 1024 });
  
  // Генерируем ключи
  const privateKey = crypt.getPrivateKey();
  const publicKey = crypt.getPublicKey();
  
  return {
    privateKey,
    publicKey,
  };
};

// Шифрование с PKCS#1 v1.5
const encryptMessage = (message, publicKeyPem) => {
  try {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKeyPem);
    
    const encrypted = encrypt.encrypt(message);
    
    if (!encrypted) {
      throw new Error('Encryption failed');
    }
    
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

// Дешифрование с PKCS#1 v1.5
const decryptMessage = (encryptedMessage, privateKeyPem) => {
  try {
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKeyPem);
    
    const decrypted = decrypt.decrypt(encryptedMessage);
    
    if (!decrypted) {
      throw new Error('Decryption failed');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Storage helpers
const STORAGE_KEYS = {
  PRIVATE_KEY: 'chat_private_key',
  PUBLIC_KEY: 'chat_public_key',
  SERVER_PUBLIC_KEY: 'chat_server_public_key',
};

const getFromStorage = (key) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setToStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

export default function VideoCallChat({ roomCode, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageId, setLastMessageId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Crypto states
  const [cryptoReady, setCryptoReady] = useState(false);
  const [privateKey, setPrivateKey] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [serverPublicKey, setServerPublicKey] = useState(null);
  
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  // ✅ Запрос разрешения на уведомления
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Initialize crypto keys IMMEDIATELY on component mount
  useEffect(() => {
    const initCrypto = async () => {
      try {
        console.log('Starting crypto initialization with PKCS#1 v1.5...');
        
        // Проверяем есть ли ключи в localStorage
        let privKey = getFromStorage(STORAGE_KEYS.PRIVATE_KEY);
        let pubKey = getFromStorage(STORAGE_KEYS.PUBLIC_KEY);
        let serverPubKey = getFromStorage(STORAGE_KEYS.SERVER_PUBLIC_KEY);

        // Если ключей нет - генерируем новые
        if (!privKey || !pubKey) {
          console.log('Generating new RSA-1024 PKCS#1 v1.5 key pair...');
          const keys = generateKeyPair();
          privKey = keys.privateKey;
          pubKey = keys.publicKey;
          
          setToStorage(STORAGE_KEYS.PRIVATE_KEY, privKey);
          setToStorage(STORAGE_KEYS.PUBLIC_KEY, pubKey);
          console.log('Keys generated and saved to localStorage');
          console.log('Public key:', pubKey);
        } else {
          console.log('Using existing PKCS#1 v1.5 keys from localStorage');
        }

        setPrivateKey(privKey);
        setPublicKey(pubKey);

        // ВСЕГДА делаем handshake при старте
        console.log('Performing handshake with server...');
        try {
          const response = await api.post('/crypto/handshake', {
            public_key_user: pubKey,
          });

          serverPubKey = response.data.public_key_server;
          setToStorage(STORAGE_KEYS.SERVER_PUBLIC_KEY, serverPubKey);
          console.log('Handshake successful, received server public key');
          console.log('Server public key:', serverPubKey);
        } catch (error) {
          console.error('Handshake failed:', error);
          // Если handshake не удался, пробуем использовать старый ключ из storage
          if (!serverPubKey) {
            throw new Error('No server public key available');
          }
          console.log('Using cached server public key');
        }

        setServerPublicKey(serverPubKey);
        setCryptoReady(true);
        console.log('Crypto initialized successfully (PKCS#1 v1.5 padding)');
        
        // Тестируем шифрование/дешифрование
        try {
          const testMessage = 'test';
          const encrypted = encryptMessage(testMessage, serverPubKey);
          console.log('Test encryption successful:', encrypted.substring(0, 50) + '...');
        } catch (error) {
          console.error('Test encryption failed:', error);
        }
      } catch (error) {
        console.error('Failed to initialize crypto:', error);
        // Даже при ошибке пытаемся работать, если есть старые ключи
        const cachedServerKey = getFromStorage(STORAGE_KEYS.SERVER_PUBLIC_KEY);
        const cachedPrivKey = getFromStorage(STORAGE_KEYS.PRIVATE_KEY);
        const cachedPubKey = getFromStorage(STORAGE_KEYS.PUBLIC_KEY);
        
        if (cachedServerKey && cachedPrivKey && cachedPubKey) {
          console.log('Using all cached keys as fallback');
          setPrivateKey(cachedPrivKey);
          setPublicKey(cachedPubKey);
          setServerPublicKey(cachedServerKey);
          setCryptoReady(true);
        }
      }
    };

    initCrypto();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Функция для сортировки сообщений по send_at
  const sortMessages = (msgs) => {
    return [...msgs].sort((a, b) => {
      const dateA = new Date(a.send_at);
      const dateB = new Date(b.send_at);
      return dateA - dateB; // От старых к новым (сверху вниз)
    });
  };

  const pollMessages = async () => {
    if (!roomCode || !cryptoReady) return;

    try {
      const response = await api.post(`/rooms/${roomCode}/poll`, {
        last_message_id: lastMessageId,
        public_key_user: publicKey,
        timeout: 1
      });

      if (response.data) {
        const data = response.data;
        
        // Обновляем количество пользователей
        if (data.user_count !== undefined) {
          setUserCount(data.user_count);
        }

        // Обрабатываем новые сообщения
        if (data.messages && data.messages.length > 0) {
          if (isOpen) {
            // ✅ ЧАТ ОТКРЫТ - добавляем новые сообщения в список
            console.log('📥 Получены новые сообщения, добавляем в открытый чат');
            
            const decryptedNewMessages = data.messages.map((msg) => {
              try {
                const decryptedText = decryptMessage(msg.text, privateKey);
                return {
                  ...msg,
                  text: decryptedText,
                };
              } catch (error) {
                console.error('Failed to decrypt message:', error);
                return {
                  ...msg,
                  text: '[Ошибка расшифровки]',
                };
              }
            });

            // Добавляем новые сообщения и сортируем весь список
            setMessages(prevMessages => {
              // Фильтруем дубликаты по ID
              const existingIds = new Set(prevMessages.map(m => m.id));
              const uniqueNewMessages = decryptedNewMessages.filter(m => !existingIds.has(m.id));
              
              if (uniqueNewMessages.length > 0) {
                const combined = [...prevMessages, ...uniqueNewMessages];
                return sortMessages(combined);
              }
              return prevMessages;
            });

            // Обновляем last_message_id на последнее полученное сообщение
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg && lastMsg.id) {
              setLastMessageId(lastMsg.id);
            }
          } else {
            // ✅ ЧАТ ЗАКРЫТ - НЕ обновляем сообщения, только уведомление
            console.log('🔔 Чат закрыт, показываем уведомление');
          }
        }

        // Показываем browser notification только если чат закрыт
        if (!isOpen && data.notifications && data.notifications.length > 0) {
          data.notifications.forEach(notification => {
            console.log('Notification:', notification);
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Новое сообщение в чате', {
                body: notification.text || 'У вас новое сообщение',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `chat-${roomCode}`,
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const loadMessageHistory = async () => {
    if (!roomCode || !cryptoReady) return;

    setIsLoading(true);
    try {
      const response = await api.post(`/rooms/${roomCode}/messages`, {
        public_key_user: publicKey,
      });

      if (response.data && Array.isArray(response.data)) {
        // Расшифровываем историю сообщений
        const decryptedMessages = response.data.map((msg) => {
          try {
            const decryptedText = decryptMessage(msg.text, privateKey);
            return { ...msg, text: decryptedText };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return { ...msg, text: '[Ошибка расшифровки]' };
          }
        });

        // Сортируем сообщения по времени
        setMessages(sortMessages(decryptedMessages));
        
        // Устанавливаем ID последнего сообщения
        if (decryptedMessages.length > 0) {
          const lastMsg = decryptedMessages[decryptedMessages.length - 1];
          setLastMessageId(lastMsg.id);
        }
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ЕДИНЫЙ Polling - работает ВСЕГДА (и когда чат открыт, и когда закрыт)
  useEffect(() => {
    if (!cryptoReady || !roomCode) return;

    console.log('🟢 Polling запущен (чат', isOpen ? 'открыт' : 'закрыт', ')');
    
    const startPolling = async () => {
      await pollMessages();
      // Каждые 2 секунды проверяем новые сообщения
      pollingRef.current = setInterval(pollMessages, 2000);
    };

    startPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        console.log('🔴 Polling остановлен');
      }
    };
  }, [cryptoReady, roomCode]); // УБРАЛ lastMessageId, publicKey, privateKey из зависимостей!

  // Load history when chat opens
  useEffect(() => {
    if (isOpen && roomCode && cryptoReady) {
      loadMessageHistory();
    }
  }, [isOpen, roomCode, cryptoReady]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !roomCode || !cryptoReady) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Очищаем сразу
    
    try {
      console.log('Encrypting message with server public key (PKCS#1 v1.5)...');
      
      // Шифруем сообщение публичным ключом сервера
      const encryptedText = encryptMessage(messageText, serverPublicKey);
      
      console.log('Message encrypted, sending to server...');
      console.log('Encrypted text (first 100 chars):', encryptedText.substring(0, 100));

      const response = await api.post(`/rooms/${roomCode}/messages/send`, {
        public_key_user: publicKey,
        text: encryptedText,
        message_type: 'text',
      });

      console.log('Message sent successfully', response.data);
      
      // Сообщение автоматически придет через polling
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Возвращаем текст обратно в поле ввода при ошибке
      setNewMessage(messageText);
      
      alert('Не удалось отправить сообщение: ' + error.message);
    }
  };

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: cryptoReady 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #888 0%, #666 100%)',
          color: '#fff',
          fontSize: '28px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.5)',
          zIndex: 999,
          transition: 'all 0.3s ease',
          opacity: cryptoReady ? 1 : 0.6,
        }}
        title={cryptoReady ? "Открыть чат (PKCS#1 v1.5)" : "Инициализация PKCS#1..."}
        onMouseEnter={(e) => {
          if (cryptoReady) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.7)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.5)';
        }}
      >
        {cryptoReady ? '💬' : '⏳'}
      </button>
    );
  }

  // Показываем загрузку если крипто еще не готово
  if (!cryptoReady) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '380px',
          height: '600px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'rgba(30, 30, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
          Инициализация шифрования...
        </p>
        <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.5 }}>
          RSA-1024 PKCS#1 v1.5
        </p>
        <button
          onClick={onToggle}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: isMinimized ? '-340px' : '20px',
        bottom: '20px',
        width: '400px',
        height: isMinimized ? '60px' : '600px',
        background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: cryptoReady ? '#10b981' : '#f59e0b',
              boxShadow: cryptoReady ? '0 0 10px #10b981' : '0 0 10px #f59e0b',
              animation: 'pulse 2s infinite',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
              Чат комнаты
            </h3>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7, color: '#fff' }}>
              {userCount} {userCount === 1 ? 'участник' : 'участников'} • {cryptoReady ? 'Зашифровано' : 'Инициализация...'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px 8px',
              borderRadius: '8px',
              opacity: 0.7,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.opacity = '0.7';
            }}
            title={isMinimized ? 'Развернуть' : 'Свернуть'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px 8px',
              borderRadius: '8px',
              opacity: 0.7,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.opacity = '0.7';
            }}
            title="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTop: '3px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.5,
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '12px' }}>💬</span>
            <p style={{ margin: 0, fontSize: '14px' }}>Нет сообщений</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
              Начните общение (PKCS#1 v1.5)
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#a78bfa',
                  }}
                >
                  {message.user_nickname || 'Аноним'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.5,
                  }}
                >
                  {new Date(message.send_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Сообщение..."
            maxLength={500}
            autoComplete="off"
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              padding: '12px 20px',
              background: newMessage.trim()
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '18px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: newMessage.trim() ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (newMessage.trim()) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            ➤
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Custom scrollbar */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
