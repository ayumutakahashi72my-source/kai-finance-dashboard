export default function LoginLoading() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--kai-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#fb9477',
          boxShadow: '0 0 12px #fb947788',
          animation: 'kai-login-loading-pulse 1.2s ease-in-out infinite',
        }}
      />
    </main>
  )
}
