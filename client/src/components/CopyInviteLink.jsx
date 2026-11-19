import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { roomInviteUrl } from '../lib/roomInvite';
import { useToast } from '../hooks/useToast';

export function CopyInviteLink({ roomCode, className }) {
  const { addToast } = useToast();

  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyLink() {
    const url = roomInviteUrl(roomCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
      addToast({ message: 'Invite link copied', type: 'success' });
    } catch {
      window.prompt('Copy this room invite link', url);
    }
  }

  return (
    <button type="button" className={className} onClick={copyLink} aria-label="Copy invite link" title="Copy invite link">
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      <span>{copied ? 'Copied' : 'Copy Link'}</span>
    </button>
  );
}
