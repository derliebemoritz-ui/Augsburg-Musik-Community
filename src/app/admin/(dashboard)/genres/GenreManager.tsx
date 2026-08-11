"use client";

import { useState, useTransition } from "react";
import { createGenre, deleteGenre, renameGenre } from "@/lib/actions/genres";

type Genre = { id: string; name: string; trackCount: number };

export default function GenreManager({ initialGenres }: { initialGenres: Genre[] }) {
  const [genres, setGenres] = useState(initialGenres);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGenre(newName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGenres((prev) =>
        [...prev, { id: result.data.id, name: newName.trim(), trackCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name, "de")
        )
      );
      setNewName("");
    });
  }

  function handleRename(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await renameGenre(id, editingName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGenres((prev) =>
        prev
          .map((g) => (g.id === id ? { ...g, name: editingName.trim() } : g))
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
      );
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    setError(null);
    if (!confirm("Dieses Genre wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deleteGenre(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGenres((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div className="max-w-xl">
      {error && (
        <p className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="mb-6 divide-y divide-line border border-line bg-surface">
        {genres.map((genre) => (
          <li key={genre.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editingId === genre.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(genre.id)}
                className="flex-1 border border-line px-2 py-1 text-sm"
              />
            ) : (
              <span className="text-sm text-ink">
                {genre.name}{" "}
                <span className="text-ink-muted">
                  ({genre.trackCount} Track{genre.trackCount === 1 ? "" : "s"})
                </span>
              </span>
            )}
            <div className="flex shrink-0 gap-3 text-sm">
              {editingId === genre.id ? (
                <>
                  <button
                    disabled={isPending}
                    onClick={() => handleRename(genre.id)}
                    className="text-cyan hover:underline"
                  >
                    Speichern
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-ink-muted hover:underline">
                    Abbrechen
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(genre.id);
                      setEditingName(genre.name);
                    }}
                    className="text-ink-muted hover:underline"
                  >
                    Umbenennen
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(genre.id)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {genres.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-muted">
            Noch keine Genres angelegt.
          </li>
        )}
      </ul>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neues Genre, z.B. Jazz"
          className="flex-1 border border-line px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        />
        <button
          type="submit"
          disabled={isPending || newName.trim().length === 0}
          className="bg-ink px-4 py-2 text-sm font-medium text-page hover:bg-surface-alt hover:text-ink disabled:opacity-50"
        >
          Anlegen
        </button>
      </form>
    </div>
  );
}
