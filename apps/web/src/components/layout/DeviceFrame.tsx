// Renders the given route inside a real iframe so the preview gets a genuine
// ~400px viewport. That makes Tailwind's viewport breakpoints (sm:, md:) evaluate
// exactly as they would on a phone — no per-page overrides needed. The iframe is
// same-origin, so it shares the session cookie and is authenticated. AppShell
// detects it's running inside this frame and skips the frame/toggle chrome, so
// there's no infinite nesting.
export function DeviceFrame({ src }: { src: string }) {
  return (
    <div className="min-h-dvh bg-kertas md:flex md:min-h-dvh md:items-center md:justify-center md:bg-tinta md:p-6 print:block print:min-h-0 print:bg-white print:p-0">
      <div
        className="
          phone-frame
          h-dvh w-full overflow-hidden bg-kertas
          md:h-[860px] md:max-h-[calc(100dvh-3rem)] md:w-[400px]
          md:rounded-[2.75rem] md:border-[10px] md:border-[#10142b] md:shadow-2xl
          print:h-auto print:max-h-none print:w-full print:overflow-visible print:rounded-none print:border-0 print:shadow-none
        "
      >
        <iframe src={src} title="Pratinjau seluler" className="block h-full w-full border-0 bg-kertas" />
      </div>
    </div>
  );
}
