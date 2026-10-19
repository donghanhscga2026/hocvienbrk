/** Thanh điều hướng gọi lưu nháp, không tự xuất bản khi đổi bước. */
export type CourseEditorControls = {
  save: () => Promise<boolean>
  history?: () => Promise<void>
}
