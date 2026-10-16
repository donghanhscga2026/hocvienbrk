// Stable account ID: a learner can also teach, so URLs do not depend on role.
export const learningProfileHref = (userId: number | string, courseId?: number) =>
  `/ho-so-hoc-tap/${encodeURIComponent(String(userId))}${courseId == null ? '' : '?course=' + courseId}`

export class LearningProfileError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}
