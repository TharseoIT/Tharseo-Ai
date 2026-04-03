import Icon from './Icon'

export default function EmptyState({ agents, activeAgent, onSwitchAgent, onSetInput }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-16">
      <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center p-3">
        <img src="/tharseo-logo.svg" alt="Tharseo" className="w-full h-full" />
      </div>
      <div>
        <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface">Tharseo AI</h2>
        <p className="text-on-surface-variant mt-2 text-sm">Your AI team, always on. Select an agent or click a prompt to get started.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl w-full text-left">
        {agents.map(a => (
          <div key={a.id} className="flex flex-col rounded-xl bg-surface-container-low border border-outline-variant/10 overflow-hidden">
            <button
              onClick={() => onSwitchAgent(a.id)}
              className={`flex items-center gap-3 px-5 py-4 transition-all hover:bg-surface-container w-full text-left
                ${activeAgent === a.id ? 'border-l-2 border-tharseo-yellow' : 'border-l-2 border-transparent'}`}
            >
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                <Icon name={a.icon} className="text-primary" />
              </div>
              <div>
                <div className="font-headline font-bold text-sm text-on-surface">{a.label}</div>
                <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">{a.desc}</div>
              </div>
            </button>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed px-5 pb-3">{a.about}</p>
            <div className="flex flex-col gap-1.5 px-5 pb-5">
              {a.prompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { onSwitchAgent(a.id); onSetInput(prompt) }}
                  className="text-left text-xs text-on-surface-variant hover:text-primary bg-surface-container hover:bg-surface-container-high px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 group"
                >
                  <Icon name="arrow_forward" className="text-sm text-on-surface-variant/30 group-hover:text-primary shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
