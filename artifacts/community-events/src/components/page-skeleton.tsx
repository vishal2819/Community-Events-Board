export function PageSkeleton() {
  return (
    <div className="px-4 md:px-8 pt-24 pb-12" aria-busy="true" aria-label="Loading">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="sk h-10 w-2/3 max-w-xl" /><div className="sk h-5 w-1/2 max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <div key={i} className="sk h-72 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
