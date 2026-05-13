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
  reply: string | null;
  resolved: number;
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
            className={`transition-colors ${s <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-zinc-600"}`}
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
          className={s <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-200 dark:text-zinc-700"}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [stars, setStars] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch("/api/feedback");
    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      setFeedbacks(data.items);
      setIsAdmin(!!data.isAdmin);
    }
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💬 Comunidad</h1>
        <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">Opiniones y sugerencias del grupo</p>
      </header>

      {/* Submit form */}
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 mb-4 space-y-3">
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wide">Deja tu opinión</p>
        <StarPicker value={stars} onChange={setStars} />
        <textarea
          rows={3}
          placeholder="Escribe tu opinión o sugerencia..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-gray-400 dark:placeholder:text-zinc-600 resize-none"
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
          <p className="text-gray-300 dark:text-zinc-600 text-sm text-center py-10">Sin opiniones todavía. ¡Sé el primero!</p>
        )}
        {feedbacks.map((fb) => (
          <div key={fb.id} className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-brand-400">{fb.author}</span>
                {!!fb.resolved && (
                  <span className="text-[10px] text-green-500 font-medium">✅ Corregido</span>
                )}
                <span className="text-[10px] text-gray-300 dark:text-zinc-600">
                  {new Date(fb.createdAt).toLocaleDateString("es-ES")}
                </span>
              </div>
              <StarDisplay value={Number(fb.stars) || 5} />
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed mb-2">{fb.message}</p>
            {fb.reply && (
              <div className="mt-2 pl-3 border-l-2 border-brand-500/40 text-xs text-gray-500 dark:text-zinc-400">
                <span className="font-semibold text-brand-400">Admin: </span>{fb.reply}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleLike(fb.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  fb.userLiked ? "text-red-400" : "text-gray-300 dark:text-zinc-600 hover:text-red-400"
                }`}
              >
                <Heart size={14} className={fb.userLiked ? "fill-red-400" : ""} />
                {Number(fb.likes) > 0 && <span>{fb.likes}</span>}
              </button>
              {(fb.isOwner || isAdmin) ? (
                <button
                  onClick={() => handleDelete(fb.id)}
                  className="text-gray-200 dark:text-zinc-700 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
            {isAdmin && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Responder..."
                    className="flex-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded px-2 py-1 focus:outline-none"
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;
                      const reply = (e.target as HTMLInputElement).value.trim();
                      if (!reply) return;
                      await fetch(`/api/feedback/${fb.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reply }),
                      });
                      (e.target as HTMLInputElement).value = "";
                      await load();
                    }}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!fb.resolved}
                    onChange={async () => {
                      await fetch(`/api/feedback/${fb.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ resolved: !fb.resolved }),
                      });
                      await load();
                    }}
                  />
                  Marcar como corregido
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
