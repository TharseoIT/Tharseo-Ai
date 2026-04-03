export default function ChangePasswordModal({ onClose, onSubmit, form, onChange, error, success, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container rounded-xl p-8 w-full max-w-sm border border-outline-variant/10 shadow-2xl">
        <h2 className="font-headline font-bold text-on-surface mb-6 text-sm uppercase tracking-widest">Change Password</h2>
        {success ? (
          <p className="text-primary text-sm font-label text-center py-4">Password updated successfully.</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {[
              { label: 'Current Password', key: 'current' },
              { label: 'New Password',     key: 'next' },
              { label: 'Confirm New',      key: 'confirm' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1.5">{label}</label>
                <input
                  type="password"
                  value={form[key]}
                  onChange={e => onChange(key, e.target.value)}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2.5 text-on-surface text-sm font-body focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            ))}
            {error && <p className="text-error text-xs font-label">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/20 text-on-surface-variant text-sm font-headline hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-sm font-headline font-bold hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
