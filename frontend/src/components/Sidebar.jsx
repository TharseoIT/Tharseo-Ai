import Icon from './Icon'

export default function Sidebar({
  agents,
  activeAgent,
  onSwitchAgent,
  onNewSession,
  sidebarOpen,
  docs,
  docsOpen,
  onToggleDocs,
  uploading,
  uploadError,
  fileInputRef,
  onUpload,
  onDeleteDoc,
  username,
  onChangePassword,
  onLogout,
}) {
  return (
    <aside className={`w-[260px] h-screen fixed left-0 top-0 bg-[#030810]/90 backdrop-blur-2xl flex flex-col py-6 z-50 transition-transform duration-300 border-r border-white/5
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

      {/* Brand */}
      <div className="px-6 mb-8">
        <div className="flex flex-col items-center text-center gap-3">
          <img src="/tharseo-logo.png" alt="Tharseo" className="w-48 h-auto drop-shadow-lg" />
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Tharseo AI</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">Your AI team, always on.</p>
          </div>
        </div>
      </div>

      {/* New Session */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewSession}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/8 text-white/70 hover:text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-semibold active:scale-95"
        >
          <Icon name="add" className="text-sm" />
          New Session
        </button>
      </div>

      {/* Agent list */}
      <nav className="flex-1">
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => onSwitchAgent(a.id)}
            className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-all text-sm tracking-tight
              ${activeAgent === a.id
                ? 'border-l-2 border-[#95B552] bg-white/8 text-white font-semibold'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent'}`}
          >
            <Icon name={a.icon} />
            {a.label}
          </button>
        ))}
      </nav>

      {/* Knowledge Base */}
      <div className="px-4 mb-2">
        <button
          onClick={onToggleDocs}
          className="w-full flex items-center justify-between px-2 py-2 text-white/30 hover:text-white/60 text-xs uppercase tracking-[0.18em] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Icon name="folder_open" className="text-sm" />
            Knowledge Base
          </span>
          <span className="flex items-center gap-2">
            {docs.length > 0 && (
              <span className="bg-[#95B552]/20 text-[#95B552] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {docs.length}
              </span>
            )}
            <Icon name={docsOpen ? 'expand_less' : 'expand_more'} className="text-sm" />
          </span>
        </button>

        {docsOpen && (
          <div className="mt-1 space-y-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
            >
              <Icon name={uploading ? 'hourglass_empty' : 'upload_file'} className="text-sm" />
              {uploading ? 'Processing...' : 'Upload document'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" onChange={onUpload} className="hidden" />
            <p className="text-[10px] text-white/20 px-3">PDF · DOCX · PPTX · TXT</p>
            {uploadError && <p className="text-[10px] text-red-400 px-3">{uploadError}</p>}
            {docs.length === 0
              ? <p className="text-[10px] text-white/20 px-3 py-1">No documents yet</p>
              : docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 group">
                  <Icon name="description" className="text-sm text-white/30 shrink-0" />
                  <span className="flex-1 text-[11px] text-white/50 truncate" title={doc.filename}>{doc.filename}</span>
                  <span className="text-[9px] text-white/20 shrink-0">{doc.chunk_count}c</span>
                  <button onClick={() => onDeleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 shrink-0" title="Remove">
                    <Icon name="delete" className="text-sm" />
                  </button>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* User + logout */}
      <div className="px-4 border-t border-white/5 pt-4 space-y-1">
        <div className="flex items-center gap-3 px-4 py-2">
          <Icon name="account_circle" className="text-white/30" />
          <span className="text-sm text-white/50 truncate flex-1">{username}</span>
        </div>
        <button
          onClick={onChangePassword}
          className="w-full flex items-center gap-3 text-white/30 hover:text-white/70 px-4 py-2.5 transition-colors rounded-lg hover:bg-white/5 text-sm"
        >
          <Icon name="lock" />
          Change password
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 text-white/30 hover:text-red-400 px-4 py-2.5 transition-colors rounded-lg hover:bg-red-500/5 text-sm"
        >
          <Icon name="logout" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
