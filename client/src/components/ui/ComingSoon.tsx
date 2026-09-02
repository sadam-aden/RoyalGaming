import { Topbar } from "../layout/Topbar";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <Topbar title={title} />
      <div className="flex h-[70vh] items-center justify-center p-8">
        <p className="text-sm text-text-faint">This section is being built next.</p>
      </div>
    </div>
  );
}
