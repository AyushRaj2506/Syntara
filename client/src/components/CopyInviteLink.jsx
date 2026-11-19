import { Link2 } from 'lucide-react';
import { roomInviteUrl } from '../lib/roomInvite';
import { useToast } from '../hooks/useToast';

export function CopyInviteLink({ roomCode, className }) {
  const { addToast } = useToast();

  async function copyLink() {
    const url = roomInviteUrl(roomCode);
    try {
      await navigator.clipboard.writeText(url);
      addToast({ message: 'Invite link copied', type: 'success' });
    } catch {
      window.prompt('Copy this room invite link', url);
    }
  }

  return (
    <button type="button" className={className} onClick={copyLink} aria-label="Copy invite link" title="Copy invite link">
      <Link2 size={16} aria-hidden="true" />
      <span>Copy Link</span>
    </button>
  );
}
