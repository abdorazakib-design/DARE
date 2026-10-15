/** Fixed, animated ambient background: gradient orbs + drifting grid. */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="animate-float-slow absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-neon-500/[0.07] blur-[120px]" />
      <div className="animate-float-slower absolute -right-40 -bottom-40 h-[560px] w-[560px] rounded-full bg-plasma-500/[0.08] blur-[130px]" />
      <div className="animate-float-slow absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-neon-400/[0.04] blur-[100px]" />
      <div
        className="animate-grid-pan absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(148 163 184 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(148 163 184 / 0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)',
        }}
      />
    </div>
  )
}
