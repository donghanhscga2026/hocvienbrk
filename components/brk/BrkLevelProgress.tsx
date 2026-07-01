'use client'

interface BrkLevelProgressProps {
  currentLevel: number
  totalPoints: number
  progress: number
  pointsNeeded: number
  nextLevel?: number
}

const LEVEL_NAMES = ['', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Cấp 5', 'Cấp 6', 'Cấp 7', 'Cấp 8']
const LEVEL_COLORS = ['', 'bg-slate-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-rose-400', 'bg-red-400', 'bg-amber-400']

export default function BrkLevelProgress({ currentLevel, totalPoints, progress, pointsNeeded, nextLevel }: BrkLevelProgressProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm text-gray-500">Cấp bậc hiện tại</span>
          <h3 className={`text-xl font-bold ${currentLevel >= 6 ? 'text-amber-600' : currentLevel >= 4 ? 'text-purple-600' : 'text-blue-600'}`}>
            {LEVEL_NAMES[currentLevel] || `Cấp ${currentLevel}`}
          </h3>
        </div>
        {nextLevel && (
          <div className="text-right">
            <span className="text-sm text-gray-500">Mục tiêu</span>
            <div className={`font-semibold ${LEVEL_COLORS[nextLevel]?.replace('bg-', 'text-') || 'text-gray-400'}`}>
              {LEVEL_NAMES[nextLevel] || `Cấp ${nextLevel}`}
            </div>
          </div>
        )}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${LEVEL_COLORS[currentLevel + 1] || 'bg-blue-500'}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          {totalPoints.toFixed(0)} điểm BRKD
        </span>
        {nextLevel && pointsNeeded > 0 && (
          <span className="text-gray-400">
            Cần {pointsNeeded.toFixed(0)} điểm nữa
          </span>
        )}
      </div>
    </div>
  )
}
