export default function FiltersBar({ children, right }) {
  return (
    <div className="toolbar">
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {right}
      </div>
    </div>
  );
}


