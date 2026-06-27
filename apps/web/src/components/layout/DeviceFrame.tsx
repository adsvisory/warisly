export function DeviceFrame({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}
