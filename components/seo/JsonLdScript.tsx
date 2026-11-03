/** Thẻ script JSON-LD dùng chung cho các nhánh giao diện ở layout gốc. */
export default function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
