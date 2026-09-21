export default function SkillProfileLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-7 flex animate-pulse flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="h-3 w-44 rounded bg-[#e6eaf0]" />
          <div className="mt-3 h-8 w-64 rounded bg-[#e6eaf0]" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e6eaf0]" />
        </div>
        <div className="h-9 w-40 rounded-xl bg-[#e6eaf0]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
          ))}
        </div>
      </div>
    </div>
  )
}