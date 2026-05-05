"use client";

import { useEffect, useState } from "react";
import { Heart, Star, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type Feedback = {
  id: string;
  author: string;
  message: string;
  stars: number;
  likes: number;
  userLiked: number;
  isOwner: number;
  createdAt: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            size={22}
            className={`transition-colors ${s <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"}`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= value ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [message, setMessage] = useState("");
  const [stars, setStars] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch("/api/feedback");
    const data = await res.json();
    if (Array.isArray(data)) setFeedbacks(data);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), stars }),
    });
    if (res.ok) {
      setMessage("");
      setStars(5);
      await load();
    }
    setSubmitting(false);
  }

  async function handleLike(id: string) {
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, userLiked: f.userLiked ? 0 : 1, likes: f.userLiked ? f.likes - 1 : f.likes + 1 }
          : f
      )
    );
    await fetch(`/api/feedback/${id}/like`, { method: "POST" });
  }

  async function handleDelete(id: string) {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/feedback/${id}`, { method: "DELETE" });
  }

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">💬 Comunidad</h1>
        <p className="text-zinc-500 text-sm mt-1">Opiniones y sugerencias del grupo</p>
      </header>

      {/* Submit form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 mb-4 space-y-3">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Deja tu opinión</p>
        <StarPicker value={stars} onChange={setStars} />
        <textarea
          rows={3}
          placeholder="Escribe tu opinión o sugerencia..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-600 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="w-full py-2.5 rounded-lg bg-brand-500 text-zinc-950 text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          {submitting ? "Enviando..." : "Publicar"}
        </button>
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {feedbacks.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Sin opiniones todavía. ¡Sé el primero!</p>
        )}
        {feedbacks.map((fb) => (
          <div key={fb.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-xs font-semibold text-brand-400">{fb.author}</span>
                <span className="text-[10px] text-zinc-600 ml-2">
                  {new Date(fb.createdAt).toLocaleDateString("es-ES")}
                </span>
              </div>
              <StarDisplay value={Number(fb.stars) || 5} />
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-2">{fb.message}</p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleLike(fb.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  fb.userLiked ? "text-red-400" : "text-zinc-600 hover:text-red-400"
                }`}
              >
                <Heart size={14} className={fb.userLiked ? "fill-red-400" : ""} />
                {Number(fb.likes) > 0 && <span>{fb.likes}</span>}
              </button>
              {fb.isOwner ? (
                <button
                  onClick={() => handleDelete(fb.id)}
                  className="text-zinc-700 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
