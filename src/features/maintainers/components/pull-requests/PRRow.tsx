import { useState } from 'react'
import {
  GitPullRequest,
  User,
  Package,
  CircleCheck,
  CircleX,
  Trophy,
  Eye,
  Code,
} from 'lucide-react'
import { useTheme } from '../../../../shared/contexts/ThemeContext'
import { PullRequest } from '../../types'

interface PRRowProps {
  pr: PullRequest
}

export function PRRow({ pr }: PRRowProps) {
  const { theme } = useTheme()
  const [authorImgFailed, setAuthorImgFailed] = useState(false)
  const [repoImgFailed, setRepoImgFailed] = useState(false)

  const getBadgeColor = (badge: string) => {
    if (badge.includes('Excellent') || badge.includes('High')) {
      return 'bg-[#22c55e]/20 text-[#16a34a] border-[#22c55e]/30'
    } else if (badge.includes('Moderate')) {
      return 'bg-[#eab308]/20 text-[#ca8a04] border-[#eab308]/30'
    } else if (badge.includes('Low') || badge.includes('No')) {
      return 'bg-[#ef4444]/20 text-[#dc2626] border-[#ef4444]/30'
    }
    return 'bg-[#7a6b5a]/20 text-[#7a6b5a] border-[#7a6b5a]/30'
  }

  const getIndicatorIcon = (indicator: string) => {
    switch (indicator) {
      case 'check':
        return { Icon: CircleCheck, color: 'text-[#22c55e]' }
      case 'x':
        return { Icon: CircleX, color: 'text-[#ef4444]' }
      case 'trophy':
        return { Icon: Trophy, color: theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]' }
      case 'eye':
        return { Icon: Eye, color: theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]' }
      case 'code':
        return { Icon: Code, color: theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]' }
      default:
        return { Icon: Code, color: theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]' }
    }
  }

  const getPRStatusColor = () => {
    switch (pr.status) {
      case 'merged':
        return 'text-[#8b5cf6]'
      case 'draft':
        return theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
      case 'open':
        return 'text-[#22c55e]'
      default:
        return theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
    }
  }

  const handleClick = () => {
    if (pr.url) {
      window.open(pr.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`grid grid-cols-[2fr_1.5fr_1fr_0.5fr] gap-6 px-6 py-5 rounded-[16px] backdrop-blur-[25px] border transition-all cursor-pointer group ${
        theme === 'dark'
          ? 'bg-white/[0.08] border-white/15 hover:bg-white/[0.15] hover:border-[#c9983a]/30'
          : 'bg-white/[0.08] border-white/15 hover:bg-white/[0.15] hover:border-[#c9983a]/20'
      }`}
    >
      {/* Pull Request Info */}
      <div>
        <div className="flex items-start gap-3 mb-2">
          <GitPullRequest className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getPRStatusColor()}`} />
          <div className="flex-1 min-w-0">
            <h3
              className={`text-[15px] font-bold group-hover:text-[#c9983a] transition-colors mb-1 line-clamp-1 ${
                theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}
            >
              {pr.title}
            </h3>
            <p className={`text-[12px] ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              #{pr.number} • {pr.statusDetail}
            </p>
          </div>
        </div>
      </div>

      {/* Author Info */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {authorImgFailed ? (
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center"
              role="img"
              aria-label={pr.author.name}
            >
              <User className="w-4 h-4 text-white" />
            </div>
          ) : (
            <img
              src={`https://github.com/${pr.author.name}.png?size=28`}
              alt={pr.author.name}
              className="w-7 h-7 rounded-full border border-[#c9983a]/40"
              onError={() => setAuthorImgFailed(true)}
            />
          )}
          <span
            className={`text-[13px] font-semibold ${
              theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}
          >
            {pr.author.name}
          </span>
        </div>
        {pr.author.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pr.author.badges.map((badge, idx) => (
              <span
                key={idx}
                className={`inline-flex px-2 py-1 rounded-[6px] text-[10px] font-semibold border ${getBadgeColor(badge)}`}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Repository Info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {(() => {
            const [owner] = pr.org ? [pr.org] : pr.repo.split('/')
            const repoAvatarUrl = `https://github.com/${owner}.png?size=20`
            return repoImgFailed ? (
              <div
                className="w-5 h-5 rounded-md bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center"
                role="img"
                aria-label={pr.repo}
              >
                <Package className="w-3 h-3 text-white" />
              </div>
            ) : (
              <img
                src={repoAvatarUrl}
                alt={pr.repo}
                className="w-5 h-5 rounded-md border border-[#c9983a]/40"
                onError={() => setRepoImgFailed(true)}
              />
            )
          })()}
          <span
            className={`text-[13px] font-bold ${
              theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}
          >
            {pr.repo}
          </span>
        </div>
        <p className={`text-[11px] ml-7 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {pr.org}
        </p>
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-2">
        {pr.indicators.map((indicator, idx) => {
          const { Icon, color } = getIndicatorIcon(indicator)
          return (
            <div
              key={idx}
              className={`w-7 h-7 rounded-full border flex items-center justify-center hover:scale-110 transition-transform ${
                theme === 'dark' ? 'bg-white/20 border-white/30' : 'bg-white/30 border-white/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
