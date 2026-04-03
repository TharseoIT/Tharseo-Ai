import Icon from './Icon'

export default function ChatInput({
  fileInputRef,
  uploading,
  onUpload,
  input,
  onInputChange,
  onKeyDown,
  onSend,
  loading,
  agentLabel,
}) {
  return (
    <div className="px-4 md:px-10 pb-5 md:pb-8" style={{ background: 'linear-gradient(to top, #050d1a 60%, transparent)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-2 border border-white/10 shadow-2xl flex items-end gap-2 focus-within:border-white/20 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload a document to your Knowledge Base"
            className="p-3 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/8 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center mb-0.5 shrink-0"
          >
            <Icon name={uploading ? 'hourglass_empty' : 'attach_file'} />
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" onChange={onUpload} className="hidden" />
          <textarea
            rows={1}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${agentLabel}...`}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/25 py-3 px-3 resize-none text-sm outline-none"
            style={{ minHeight: '44px', maxHeight: '160px' }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="bg-[#175873] hover:bg-[#1e6d8e] text-white p-3 rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center mb-0.5 shadow-lg shadow-[#175873]/30"
          >
            <Icon name="arrow_upward" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-white/20">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
