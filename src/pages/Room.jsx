import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export default function Room() {
  const { id } = useParams(); // здесь id = room_code
  const [room, setRoom] = useState(null);

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
    } catch (e) {
      alert("Ошибка загрузки комнаты");
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [id]);

  if (!room) return <div style={{ color: "#fff" }}>Загрузка...</div>;

  return (
    <div style={{ padding: "30px", color: "#E8EAED", background: "#181818", height: "100vh" }}>
      <h1>Комната {room.code}</h1>
      <p>ID: {room.id}</p>
      <p>Создатель: {room.user_id}</p>
      <p>Активна: {room.is_active ? "Да" : "Нет"}</p>
      <p>Создана: {new Date(room.created_at).toLocaleString()}</p>

      <h3>Участники:</h3>
      <ul>
        {room.room_users?.map((user, index) => (
          <li key={index}>{user.user_nickname}</li>
        ))}
      </ul>
    </div>
  );
}
