export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ds-route h-dvh max-h-dvh overflow-hidden overscroll-none">
      {children}
    </div>
  );
}
