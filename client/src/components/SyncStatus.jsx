export function SyncStatus({ document }) {
  return <div className="sync-status" role="status">{document.status}</div>;
}
