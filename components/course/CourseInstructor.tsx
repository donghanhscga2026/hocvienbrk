export default function CourseInstructor({ name }: { name?: string | null }) {
  return <p className="mb-3 mt-1 break-words text-sm leading-relaxed sm:text-base">
    <span className="text-brk-muted">Giảng viên: </span>
    <span className="font-semibold text-brk-on-surface">{name || 'Chưa cập nhật'}</span>
  </p>
}
