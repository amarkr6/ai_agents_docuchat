/**
 * FILE: components/ShareDialog.tsx
 * PURPOSE: Pop-up to manage who can ask questions about a document.
 *
 * Options: make it public (all users) or pick specific users from the directory.
 */
import { useEffect, useState } from "react";
import { getUserDirectoryApi } from "../api/users.api";
import { updateSharingApi } from "../api/documents.api";
import { getErrorMessage } from "../api/client";
import type { DocumentItem, PersonRef } from "../types";

interface Props {
  document: DocumentItem;
  onClose: () => void;
  onSaved: () => void;
}

export function ShareDialog({ document, onClose, onSaved }: Props) {
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>(document.sharedWith.map((p) => p.email));
  const [isPublic, setIsPublic] = useState(document.isPublic);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load the list of users once when the dialog opens
  useEffect(() => {
    getUserDirectoryApi()
      .then((users) => setPeople(users.filter((u) => u._id !== document.owner._id)))
      .catch((err) => setError(getErrorMessage(err)));
  }, [document.owner._id]);

  function toggleEmail(email: string) {
    setSelectedEmails((current) =>
      current.includes(email) ? current.filter((e) => e !== email) : [...current, email],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    try {
      await updateSharingApi(document._id, selectedEmails, isPublic);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Share “{document.originalName}”</h2>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public — every user can ask questions about this document
        </label>

        <p className="mt-4 text-sm font-medium text-zinc-700">Or share with specific people:</p>
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
          {people.length === 0 && <li className="text-sm text-zinc-500">No other users yet.</li>}
          {people.map((person) => (
            <li key={person._id}>
              <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(person.email)}
                  onChange={() => toggleEmail(person.email)}
                />
                <span>{person.name}</span>
                <span className="text-zinc-500">{person.email}</span>
              </label>
            </li>
          ))}
        </ul>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm hover:bg-zinc-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
