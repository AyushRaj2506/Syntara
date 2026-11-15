export function SyncStatus({ document }) {
  return <div className="sync-status" role="status">
    <span>{document.status}</span>
    {document.conflict ? <details>
      <summary>Compare with latest version</summary>
      <pre>{document.conflict.content ?? document.conflict.code}</pre>
      <button onClick={document.useLatest}>Use latest (discard my draft)</button>
      <button onClick={document.saveDraft}>Save my draft over this version</button>
    </details> : document.status !== 'Saved' && <button onClick={document.retry}>Retry save</button>}
  </div>;
}
